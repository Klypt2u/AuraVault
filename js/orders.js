/* ============================================================
   AURA//VAULT — orders module
   Order model, status system, SVG placeholders. Starts empty.
   ============================================================ */

(function () {
  "use strict";

  const STATUSES = [
    { id: "pending", label: "PENDING", rank: 0 },
    { id: "purchased", label: "PURCHASED", rank: 1 },
    { id: "warehouse", label: "ARRIVED AT WAREHOUSE", rank: 2 },
    { id: "qc", label: "QC AVAILABLE", rank: 3 },
    { id: "shipped", label: "SHIPPED", rank: 4 },
  ];

  const PLATFORM_CODES = { taobao: "TB", weidian: "WD", "1688": "AL" };

  function statusById(id) {
    return STATUSES.find((s) => s.id === id) || STATUSES[0];
  }

  function statusLabel(id) {
    return statusById(id).label;
  }

  /* ---------- SVG placeholder helpers (fully offline, on-theme) ---------- */

  function svgDataUri(svg) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  /**
   * Product thumbnail placeholder (4:3). Mirrors the monochrome console style.
   */
  function thumbPlaceholder(order) {
    const code = PLATFORM_CODES[order.platform] || "AV";
    const id = (order.itemId || order.id || "—").slice(-8);
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">' +
      '<defs>' +
      '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#171717"/><stop offset="1" stop-color="#050505"/>' +
      "</linearGradient>" +
      "</defs>" +
      '<rect width="640" height="480" fill="url(#g)"/>' +
      '<path d="M0 0H640M0 0V480" stroke="none"/>' +
      '<g stroke="#ffffff" stroke-opacity="0.05" stroke-width="1">' +
      Array.from({ length: 12 }, (_, i) => '<line x1="' + (i * 58) + '" y1="0" x2="' + (i * 58) + '" y2="480"/>').join("") +
      Array.from({ length: 9 }, (_, i) => '<line x1="0" y1="' + (i * 60) + '" x2="640" y2="' + (i * 60) + '"/>').join("") +
      "</g>" +
      '<rect x="240" y="150" width="160" height="160" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>' +
      '<rect x="248" y="158" width="144" height="144" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>' +
      '<text x="320" y="266" font-family="monospace" font-size="52" font-weight="bold" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">' + code + "</text>" +
      '<text x="16" y="30" font-family="monospace" font-size="15" letter-spacing="2" fill="#ffffff" fill-opacity="0.55">AURA//VAULT</text>' +
      '<text x="16" y="52" font-family="monospace" font-size="13" letter-spacing="1" fill="#ffffff" fill-opacity="0.35">ITEM ID: ' + id + "</text>" +
      '<text x="624" y="462" font-family="monospace" font-size="12" letter-spacing="2" fill="#ffffff" fill-opacity="0.4" text-anchor="end">THUMB_PLACEHOLDER</text>' +
      "</svg>";
    return svgDataUri(svg);
  }

  /**
   * QC photo placeholder (square, "high-res" 1200x1200). Swap in real
   * KakoBuy QC photo URLs in the order's `qc` array to replace these.
   */
  function qcPlaceholder(order, index) {
    const code = PLATFORM_CODES[order.platform] || "AV";
    const id = (order.itemId || order.id || "—").slice(-10);
    const ts = new Date(order.updatedAt || order.createdAt || Date.now());
    const stamp =
      ts.toISOString().replace("T", " ").slice(0, 19) + "Z";
    const n = (index || 0) + 1;
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">' +
      "<defs>" +
      '<radialGradient id="v" cx="0.5" cy="0.42" r="0.75">' +
      '<stop offset="0" stop-color="#1c1c1c"/><stop offset="0.65" stop-color="#0c0c0c"/><stop offset="1" stop-color="#040404"/>' +
      "</radialGradient>" +
      '<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#ffffff" fill-opacity="0.02"/></pattern>' +
      '<linearGradient id="gx" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
      "</defs>" +
      '<rect width="1200" height="1200" fill="url(#v)"/>' +
      '<rect width="1200" height="1200" fill="url(#scan)"/>' +
      '<g stroke="#ffffff" stroke-opacity="0.045" stroke-width="1">' +
      Array.from({ length: 21 }, (_, i) => '<line x1="' + (i * 60) + '" y1="0" x2="' + (i * 60) + '" y2="1200"/>').join("") +
      Array.from({ length: 21 }, (_, i) => '<line x1="0" y1="' + (i * 60) + '" x2="1200" y2="' + (i * 60) + '"/>').join("") +
      "</g>" +
      '<rect x="300" y="300" width="600" height="600" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="3"/>' +
      '<rect x="312" y="312" width="576" height="576" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5"/>' +
      '<text x="600" y="620" font-family="monospace" font-size="120" font-weight="bold" letter-spacing="4" fill="#ffffff" fill-opacity="0.92" text-anchor="middle">' + code + "</text>" +
      '<text x="600" y="676" font-family="monospace" font-size="26" letter-spacing="6" fill="#ffffff" fill-opacity="0.5" text-anchor="middle">QC SHOT ' + String(n).padStart(2, "0") + "</text>" +
      '<rect x="40" y="44" width="300" height="44" fill="url(#gx)"/>' +
      '<text x="56" y="72" font-family="monospace" font-size="17" letter-spacing="2" fill="#ffffff" fill-opacity="0.85">ORDER ' + id + "</text>" +
      '<text x="56" y="106" font-family="monospace" font-size="13" letter-spacing="1" fill="#ffffff" fill-opacity="0.45">CAPTURED ' + stamp + "</text>" +
      '<rect x="900" y="1056" width="260" height="104" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5"/>' +
      '<text x="1030" y="1098" font-family="monospace" font-size="15" letter-spacing="3" fill="#ffffff" fill-opacity="0.75" text-anchor="middle">KAKOBUY QC</text>' +
      '<text x="1030" y="1126" font-family="monospace" font-size="12" letter-spacing="2" fill="#ffffff" fill-opacity="0.4" text-anchor="middle">WAREHOUSE CAM</text>' +
      '<text x="44" y="1152" font-family="monospace" font-size="12" letter-spacing="2" fill="#ffffff" fill-opacity="0.4">AURA//VAULT v1</text>' +
      "</svg>";
    return svgDataUri(svg);
  }

  /* ---------- Init (no demo data — the tracker starts empty) ---------- */

  function ensureInit() {
    if (AV.Storage.getOrders() === null) {
      AV.Storage.setOrders([]);
    }
  }

  /* ---------- Public API ---------- */

  function qcSrc(order, photo) {
    if (photo && photo.src) return photo.src;
    return qcPlaceholder(order, photo ? photo.index : 0);
  }

  function thumbSrc(order) {
    return thumbPlaceholder(order);
  }

  function nextId() {
    return "AV-" + String(Math.floor(1000 + Math.random() * 9000));
  }

  window.AV = window.AV || {};
  window.AV.Orders = {
    STATUSES,
    PLATFORM_CODES,
    statusById,
    statusLabel,
    ensureInit,
    qcSrc,
    thumbSrc,
    nextId,
  };
})();
