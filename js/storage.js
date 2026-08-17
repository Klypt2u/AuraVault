/* ============================================================
   AURA//VAULT — storage layer
   All persistence lives in localStorage. No backend.
   ============================================================ */

(function () {
  "use strict";

  const NS = "auravault";
  const KEYS = {
    prefs: NS + ".prefs",
    orders: NS + ".orders",
  };

  const DEFAULT_PREFS = {
    affcode: "",        // KakoBuy affiliate code appended to outlinks
    autoCopy: true,     // auto-copy outlink after conversion
    grid: false,        // show background blueprint grid
    sessionToken: "",   // KakoBuy session cookie (stored locally only)
    dataVersion: 0,     // one-time migration marker
    lastSync: 0,        // last KakoBuy sync timestamp
  };

  // Markers for the demo orders shipped in v1.0.0 — used by migrate() to
  // strip them from browsers that already persisted them.
  const DEMO_ITEM_IDS = [
    "682345678901",
    "7428736519",
    "7505929526",
    "768901234567",
    "654321098765",
    "7012345678",
  ];
  const DEMO_TITLES = [
    "Nike Tech Fleece Full-Zip Hoodie — Black",
    "Arc'teryx Beta AR Jacket — Men's Large",
    "Louis Vuitton Keepall 55 — Damier Graphite",
    "Chrome Hearts Cross Pendant Necklace — 925 Silver",
    "Essentials Fear of God Hoodie — Heather Oatmeal",
    "Balenciaga Speed Runner Sneakers — Size 44",
  ];

  function safeGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch (e) {
      console.warn("[AuraVault] failed to read", key, e);
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[AuraVault] failed to write", key, e);
      return false;
    }
  }

  const Storage = {
    getPrefs() {
      const saved = safeGet(KEYS.prefs);
      return Object.assign({}, DEFAULT_PREFS, saved || {});
    },

    setPrefs(patch) {
      const next = Object.assign(this.getPrefs(), patch || {});
      safeSet(KEYS.prefs, next);
      return next;
    },

    getOrders() {
      const list = safeGet(KEYS.orders);
      return Array.isArray(list) ? list : null; // null = never initialized
    },

    setOrders(list) {
      safeSet(KEYS.orders, Array.isArray(list) ? list : []);
    },

    saveOrder(order) {
      const list = this.getOrders() || [];
      list.push(order);
      this.setOrders(list);
    },

    updateOrder(id, patch) {
      const list = this.getOrders() || [];
      const idx = list.findIndex((o) => o.id === id);
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], patch);
      this.setOrders(list);
      return list[idx];
    },

    removeOrder(id) {
      const list = this.getOrders() || [];
      this.setOrders(list.filter((o) => o.id !== id));
    },

    exportData() {
      return JSON.stringify(
        { app: "AuraVault", version: 1, exportedAt: new Date().toISOString(), prefs: this.getPrefs(), orders: this.getOrders() || [] },
        null,
        2
      );
    },

    importData(text) {
      const data = JSON.parse(text);
      if (!data || typeof data !== "object") throw new Error("Not a valid AuraVault export.");
      if (data.prefs) this.setPrefs(data.prefs);
      if (Array.isArray(data.orders)) this.setOrders(data.orders);
      return { orders: (data.orders || []).length };
    },

    clearAll() {
      localStorage.removeItem(KEYS.prefs);
      localStorage.removeItem(KEYS.orders);
    },

    /**
     * One-time data migrations. v2: remove the demo orders that v1.0.0
     * seeded on first load, so the tracker reflects only real data.
     */
    migrate() {
      const prefs = this.getPrefs();
      if ((prefs.dataVersion || 0) >= 2) return;
      const list = this.getOrders();
      if (Array.isArray(list)) {
        const filtered = list.filter(
          (o) => !DEMO_ITEM_IDS.includes(o.itemId) && !DEMO_TITLES.includes(o.title)
        );
        if (filtered.length !== list.length) this.setOrders(filtered);
      }
      this.setPrefs({ dataVersion: 2 });
    },
  };

  window.AV = window.AV || {};
  window.AV.Storage = Storage;
})();
