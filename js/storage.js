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
    sessionToken: "",   // KakoBuy session token (stored locally only)
  };

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
  };

  window.AV = window.AV || {};
  window.AV.Storage = Storage;
})();
