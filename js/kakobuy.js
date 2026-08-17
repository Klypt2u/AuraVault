/* ============================================================
   AURA//VAULT — KakoBuy client
   Talks to the server-side proxy (Netlify Function) which holds
   the user's KakoBuy session cookie. No direct cross-origin calls
   to kakobuy.com (they would be CORS-blocked and geo-blocked).
   ============================================================ */

(function () {
  "use strict";

  const AV = window.AV;

  /**
   * Map KakoBuy's raw order status strings to AuraVault statuses.
   * Matches case-insensitively and by substring, so it keeps
   * working even if KakoBuy's exact labels change. Add/refine
   * entries once a real payload is observed.
   */
  const STATUS_RULES = [
    { match: /(shipped|outbound|transit|delivered|completed|received)/i, to: "shipped" },
    { match: /(qc|quality|inspect|photo|picture)/i, to: "qc" },
    { match: /(warehouse|inbound|arrived|stored|storage|in stock)/i, to: "warehouse" },
    { match: /(purchased|bought|paid|payment|ordered)/i, to: "purchased" },
    { match: /(pending|submitted|processing|waiting|new)/i, to: "pending" },
  ];

  function mapStatus(raw) {
    const s = String(raw || "").toLowerCase();
    for (const rule of STATUS_RULES) {
      if (rule.match.test(s)) return rule.to;
    }
    return "pending";
  }

  /**
   * Normalize one remote order into AuraVault's shape. Field names
   * are best-guesses (id/title/itemId/status/qc/url) — tweak here
   * once the real KakoBuy payload is seen.
   */
  function normalizeOrder(raw, index) {
    const o = raw || {};
    const id = String(o.id || o.orderId || o.order_id || o.no || o.orderNo || "KB-" + index);
    const title = String(o.title || o.productName || o.product_name || o.name || o.goodsName || "KakoBuy Item");
    const itemId = String(o.itemId || o.item_id || o.goodsId || o.goods_id || o.offerId || "");
    const platform = String(o.platform || o.source || o.site || "").toLowerCase();
    const status = mapStatus(o.status || o.orderStatus || o.state);
    const qc = Array.isArray(o.qc) ? o.qc.map((p) => ({ src: String(p && (p.url || p.src || p)), index: 0 })) : [];
    const sourceUrl = String(o.url || o.link || o.itemUrl || "");

    return {
      id: AV.Orders.nextId(),
      kakobuyOrderId: id,
      source: "kakobuy",
      title,
      itemId,
      platform: ["taobao", "weidian", "1688"].includes(platform)
        ? platform
        : platform.includes("1688")
          ? "1688"
          : platform.includes("weidian")
            ? "weidian"
            : "taobao",
      status,
      sourceUrl,
      kakobuyUrl: sourceUrl,
      qc,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  const KakoBuy = {
    proxyUrl() {
      const p = AV.Storage.getPrefs().proxyUrl;
      return (p && p.trim()) || "/.netlify/functions/kakobuy";
    },

    token() {
      return (AV.Storage.getPrefs().sessionToken || "").trim();
    },

    isConnected() {
      return !!this.token();
    },

    async call(action, extra) {
      const token = this.token();
      if (!token) throw new Error("Not connected to KakoBuy.");
      const url = new URL(this.proxyUrl(), location.origin);
      url.searchParams.set("action", action);
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
        });
      }
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "X-Kakobuy-Token": token, Accept: "application/json" },
      });
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        /* not JSON */
      }
      if (!res.ok || !json || json.ok !== true) {
        const msg = (json && json.error) || ("Proxy responded HTTP " + res.status);
        throw new Error(msg);
      }
      return json;
    },

    async test() {
      return this.call("test");
    },

    async fetchOrders() {
      const json = await this.call("orders");
      return Array.isArray(json.orders) ? json.orders : [];
    },

    async fetchQC(order) {
      const id = order.kakobuyOrderId || order.id;
      if (!id) return [];
      const json = await this.call("qc", { orderId: id });
      return Array.isArray(json.photos) ? json.photos : [];
    },

    /**
     * Pull remote orders and merge them into local storage.
     * Local-only orders are never overwritten; remote orders are
     * matched by kakobuyOrderId and updated in place.
     * @returns {Promise<{added:number, updated:number, total:number}>}
     */
    async syncOrders() {
      const remote = await this.fetchOrders();
      const local = AV.Storage.getOrders() || [];
      let added = 0;
      let updated = 0;

      for (const r of remote) {
        const norm = normalizeOrder(r, local.length + added);
        const existing = local.find((o) => o.kakobuyOrderId && o.kakobuyOrderId === norm.kakobuyOrderId);
        if (existing) {
          const patch = { status: norm.status, updatedAt: Date.now() };
          if (norm.title) patch.title = norm.title;
          if (norm.qc.length) patch.qc = norm.qc;
          const idx = local.indexOf(existing);
          local[idx] = Object.assign({}, local[idx], patch);
          updated++;
        } else {
          local.push(norm);
          added++;
        }
      }

      AV.Storage.setOrders(local);
      AV.Storage.setPrefs({ lastSync: Date.now() });
      return { added, updated, total: local.length };
    },

    /**
     * Attach real QC photo URLs to an order (no-op if the proxy
     * returns none or the call fails).
     */
    async syncQC(order) {
      try {
        const photos = await this.fetchQC(order);
        if (photos.length) {
          const qc = photos.map((p) => ({ src: String(p && (p.url || p.src || p)), index: 0 }));
          AV.Storage.updateOrder(order.id, { qc, updatedAt: Date.now() });
          return qc.length;
        }
      } catch (e) {
        /* keep existing QC */
      }
      return 0;
    },

    disconnect() {
      AV.Storage.setPrefs({ sessionToken: "", lastSync: 0 });
    },
  };

  window.AV = window.AV || {};
  window.AV.KakoBuy = KakoBuy;
  // Exposed for testing / advanced use.
  window.AV.KakoBuy.normalizeOrder = normalizeOrder;
  window.AV.KakoBuy.mapStatus = mapStatus;
})();
