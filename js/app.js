/* ============================================================
   AURA//VAULT — application core
   Router, views, converter flow, QC lightbox, settings.
   ============================================================ */

(function () {
  "use strict";

  const AV = window.AV;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ================= NAVIGATION ================= */

  const ICONS = {
    dashboard:
      '<svg class="side-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    converter:
      '<svg class="side-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    orders:
      '<svg class="side-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>',
    qc:
      '<svg class="side-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    settings:
      '<svg class="side-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };

  const NAV = [
    { id: "dashboard", label: "Dashboard" },
    { id: "converter", label: "Link Converter" },
    { id: "orders", label: "Order Tracker" },
    { id: "qc", label: "QC Viewer" },
    { id: "settings", label: "Settings" },
  ];

  const topNav = $("#topNav");
  const sideNav = $("#sideNav");

  NAV.forEach((item) => {
    topNav.insertAdjacentHTML(
      "beforeend",
      '<a class="nav-link" href="#/' + item.id + '" data-nav="' + item.id + '">' + item.label.toUpperCase() + "</a>"
    );
    sideNav.insertAdjacentHTML(
      "beforeend",
      '<a class="side-link" href="#/' + item.id + '" data-nav="' + item.id + '">' +
        ICONS[item.id] +
        '<span>' + item.label + "</span></a>"
    );
  });

  function showView(id) {
    $$(".view").forEach((v) => {
      const show = v.dataset.view === id;
      v.hidden = !show;
      if (show) v.style.display = "";
    });
    $$("[data-nav]").forEach((l) => l.classList.toggle("active", l.dataset.nav === id));
    window.scrollTo({ top: 0 });
  }

  function route() {
    const hash = (location.hash || "#/dashboard").replace(/^#\//, "");
    const id = NAV.some((n) => n.id === hash) ? hash : "dashboard";
    showView(id);
    if (id === "orders") renderOrders();
    if (id === "qc") renderQC();
    if (id === "dashboard") renderDashboard();
  }

  window.addEventListener("hashchange", route);

  /* ================= TOAST ================= */

  let toastTimer = null;
  function toast(msg, dark) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.toggle("toast-dark", !!dark);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  /* ================= CLIPBOARD ================= */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* ignore */
    }
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  /* ================= LINK CONVERTER ================= */

  let lastParsed = null; // { itemId, platform, sourceUrl, canonicalUrl, outlink }

  function convertNow(inputEl, opts) {
    const raw = inputEl.value;
    const parsed = AV.Parser.parse(raw);
    if (parsed.error) {
      $("#convResult").hidden = true;
      $("#convPlatformTag").textContent = "PARSE FAILED";
      toast(parsed.error, true);
      if (parsed.host) $("#convPlatformTag").textContent = parsed.host.toUpperCase();
      return;
    }

    const prefs = AV.Storage.getPrefs();
    const outlink = AV.Parser.toKakoBuy(parsed.canonicalUrl, prefs.affcode);

    lastParsed = Object.assign({}, parsed, { outlink });

    $("#convPlatformTag").textContent = parsed.platformLabel;
    $("#resultPlatformTag").textContent = parsed.platformLabel;
    $("#resultItemId").textContent = parsed.itemId;
    $("#resultSource").textContent = parsed.sourceUrl;
    $("#resultOutlink").textContent = outlink;
    $("#openKakoBtn").href = outlink;
    $("#saveOrderBtn").disabled = false;
    $("#saveOrderBtn").textContent = "+ SAVE TO ORDER TRACKER";
    $("#convResult").hidden = false;
    $("#sysPlatform").textContent = parsed.platformLabel;

    if (prefs.autoCopy) {
      copyText(outlink).then(() => toast("OUTLINK COPIED → " + outlink));
    } else {
      toast("ROUTED → " + parsed.platformLabel + " ITEM " + parsed.itemId);
    }

    if (opts && opts.navigate) {
      $("#convInput").value = raw;
      showView("converter");
    }
  }

  $("#convBtn").addEventListener("click", () => convertNow($("#convInput")));
  $("#quickConvertBtn").addEventListener("click", () => convertNow($("#quickLinkInput"), { navigate: true }));
  $("#quickLinkInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") convertNow($("#quickLinkInput"), { navigate: true });
  });
  $("#convInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) convertNow($("#convInput"));
  });
  $("#convClearBtn").addEventListener("click", () => {
    $("#convInput").value = "";
    $("#convResult").hidden = true;
    $("#convPlatformTag").textContent = "AWAITING INPUT";
    $("#sysPlatform").textContent = "—";
  });

  $("#copyItemIdBtn").addEventListener("click", () => {
    copyText($("#resultItemId").textContent).then(() => toast("ITEM ID COPIED"));
  });
  $("#copyOutlinkBtn").addEventListener("click", () => {
    copyText($("#resultOutlink").textContent).then(() => toast("OUTLINK COPIED"));
  });

  $("#saveOrderBtn").addEventListener("click", () => {
    if (!lastParsed) return;
    openAddModal({
      title: "Item " + lastParsed.itemId,
      platform: lastParsed.platform,
      itemId: lastParsed.itemId,
      source: lastParsed.sourceUrl,
      status: "pending",
    });
  });

  /* ================= ORDERS VIEW ================= */

  let orderFilter = "all";
  let orderQuery = "";

  function orderMatches(o) {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (!orderQuery) return true;
    const q = orderQuery.toLowerCase();
    return (
      (o.title || "").toLowerCase().includes(q) ||
      (o.itemId || "").toLowerCase().includes(q) ||
      (o.id || "").toLowerCase().includes(q)
    );
  }

  function sortedOrders() {
    const list = AV.Storage.getOrders() || [];
    return list.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function statusChips(container, current, onChange, options) {
    container.innerHTML = "";
    const chips = [{ id: "all", label: "ALL" }].concat(
      (options || AV.Orders.STATUSES).map((s) => ({ id: s.id, label: s.label }))
    );
    chips.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (current === c.id ? " active" : "");
      btn.textContent = c.label;
      btn.addEventListener("click", () => {
        onChange(c.id);
        $$(".chip", container).forEach((x) => x.classList.toggle("active", x === btn));
      });
      container.appendChild(btn);
    });
  }

  function orderCardHTML(o) {
    const thumb = AV.Orders.thumbSrc(o);
    const qcCount = (o.qc || []).length;
    const status = AV.Orders.statusById(o.status);
    const platform = AV.Parser.platformLabel(o.platform);
    const title = (o.title || "Untitled Item").replace(/"/g, "&quot;");
    const qcBtn =
      qcCount > 0
        ? '<button class="btn btn-ghost btn-sm" data-action="qc" data-id="' + o.id + '" type="button">QC (' + qcCount + ")</button>"
        : '<button class="btn btn-ghost btn-sm" data-action="open" data-id="' + o.id + '" type="button">OPEN ↗</button>';
    return (
      '<article class="order-card" data-order-id="' + o.id + '">' +
      '<div class="order-card-thumb" data-action="qc" data-id="' + o.id + '" title="Open QC viewer">' +
      '<img src="' + thumb + '" alt="" loading="lazy" />' +
      '<div class="thumb-overlay"></div>' +
      (qcCount > 0 ? '<span class="qc-badge">QC ×' + qcCount + "</span>" : "") +
      "</div>" +
      '<div class="order-card-body">' +
      '<h4 class="order-card-title">' + title + "</h4>" +
      '<div class="order-card-meta">' +
      '<span>' + o.id + " · " + platform + (o.itemId ? " · #" + o.itemId : "") + "</span>" +
      '<span class="status-tag status-' + status.id + '">' + status.label + "</span>" +
      "</div>" +
      '<div class="order-card-actions">' +
      '<select class="input input-sm" data-action="status" data-id="' + o.id + '" aria-label="Change status">' +
      AV.Orders.STATUSES.map(
        (s) => '<option value="' + s.id + '"' + (s.id === o.status ? " selected" : "") + ">" + s.label + "</option>"
      ).join("") +
      "</select>" +
      qcBtn +
      '<button class="btn btn-ghost btn-sm" data-action="del" data-id="' + o.id + '" type="button" title="Delete order">✕</button>' +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderOrders() {
    const grid = $("#ordersGrid");
    const list = sortedOrders().filter(orderMatches);
    grid.innerHTML = list.map(orderCardHTML).join("");
    $("#ordersEmpty").hidden = list.length > 0;
    $("#sysOrders").textContent = String((AV.Storage.getOrders() || []).length).padStart(2, "0") + " ORDERS";
  }

  statusChips($("#orderFilters"), orderFilter, (id) => {
    orderFilter = id;
    renderOrders();
  });

  $("#orderSearch").addEventListener("input", (e) => {
    orderQuery = e.target.value.trim();
    renderOrders();
  });

  /* ================= QC VIEWER ================= */

  let qcFilter = "all";

  function qcOrders() {
    return sortedOrders().filter((o) => (o.qc || []).length > 0);
  }

  function renderQC() {
    const grid = $("#qcGrid");
    const list = qcOrders().filter((o) => qcFilter === "all" || o.status === qcFilter);
    grid.innerHTML = list
      .map((o) => {
        const qc = o.qc || [];
        const thumbs = qc
          .slice(0, 3)
          .map(
            (p, i) =>
              '<img src="' + AV.Orders.qcSrc(o, p) + '" alt="QC photo ' + (i + 1) + '" loading="lazy" data-action="qc" data-id="' + o.id + '" data-index="' + i + '" />'
          )
          .join("");
        const status = AV.Orders.statusById(o.status);
        const title = (o.title || "Untitled Item").replace(/"/g, "&quot;");
        return (
          '<article class="order-card" data-order-id="' + o.id + '">' +
          '<div class="order-card-thumb qc-thumb" data-action="qc" data-id="' + o.id + '" title="Open QC lightbox">' +
          '<img src="' + AV.Orders.thumbSrc(o) + '" alt="" loading="lazy" />' +
          '<div class="thumb-overlay"></div>' +
          '<span class="qc-badge">QC ×' + qc.length + "</span>" +
          "</div>" +
          '<div class="order-card-body">' +
          "<h4 class=\"order-card-title\">" + title + "</h4>" +
          (thumbs ? '<div class="qc-strip">' + thumbs + "</div>" : "") +
          '<div class="order-card-meta">' +
          "<span>" + o.id + " · " + qc.length + " SHOTS</span>" +
          '<span class="status-tag status-' + status.id + '">' + status.label + "</span>" +
          "</div>" +
          '<div class="order-card-actions">' +
          '<button class="btn btn-primary btn-sm" data-action="qc" data-id="' + o.id + '" type="button">INSPECT PHOTOS</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="open" data-id="' + o.id + '" type="button">OPEN ↗</button>' +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
    $("#qcEmpty").hidden = list.length > 0;
    $("#qcCount").textContent = list.reduce((n, o) => n + (o.qc || []).length, 0) + " SHOTS";
  }

  statusChips($("#qcFilters"), qcFilter, (id) => {
    qcFilter = id;
    renderQC();
  });

  /* ================= GLOBAL ORDER ACTIONS (delegation) ================= */

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const order = (AV.Storage.getOrders() || []).find((o) => o.id === id);
    if (!order) return;

    switch (btn.dataset.action) {
      case "qc":
        openLightbox(order, parseInt(btn.dataset.index, 10) || 0);
        break;
      case "open": {
        const url = order.kakobuyUrl || order.sourceUrl;
        if (url) window.open(url, "_blank", "noopener");
        else toast("NO SOURCE URL ON THIS ORDER", true);
        break;
      }
      case "del":
        if (confirm("Delete order " + id + "?")) {
          AV.Storage.removeOrder(id);
          renderOrders();
          renderQC();
          renderDashboard();
          toast("ORDER " + id + " DELETED");
        }
        break;
    }
  });

  document.addEventListener("change", (e) => {
    const sel = e.target.closest('select[data-action="status"]');
    if (!sel) return;
    const order = (AV.Storage.getOrders() || []).find((o) => o.id === sel.dataset.id);
    if (!order) return;
    const next = AV.Orders.statusById(sel.value);
    const patch = { status: next.id, updatedAt: Date.now() };
    // Auto-attach placeholder QC shots when moving an order into QC.
    if (next.id === "qc" && !(order.qc || []).length) {
      patch.qc = [0, 1, 2].map((i) => ({ src: null, index: i }));
    }
    AV.Storage.updateOrder(order.id, patch);
    renderOrders();
    renderQC();
    renderDashboard();
    toast(order.id + " → " + next.label);
  });

  /* ================= ADD ORDER MODAL ================= */

  const addModal = $("#addModal");

  function openAddModal(prefill) {
    $("#mTitle").value = (prefill && prefill.title) || "";
    $("#mPlatform").value = (prefill && prefill.platform) || "taobao";
    $("#mItemId").value = (prefill && prefill.itemId) || "";
    $("#mStatus").value = (prefill && prefill.status) || "pending";
    $("#mSource").value = (prefill && prefill.source) || "";
    addModal.hidden = false;
    document.body.style.overflow = "hidden";
    $("#mTitle").focus();
  }

  function closeAddModal() {
    addModal.hidden = true;
    document.body.style.overflow = "";
  }

  $("#addOrderBtn").addEventListener("click", () => openAddModal());

  $("#mSaveBtn").addEventListener("click", () => {
    const title = $("#mTitle").value.trim();
    const itemId = $("#mItemId").value.trim();
    if (!title || !itemId) {
      toast("TITLE AND ITEM ID REQUIRED", true);
      return;
    }
    const platform = $("#mPlatform").value;
    const status = $("#mStatus").value;
    const source = $("#mSource").value.trim();
    const prefs = AV.Storage.getPrefs();
    const canonical = AV.Parser.PLATFORMS[platform].canonical(itemId);
    const qc = status === "qc" ? [0, 1, 2].map((i) => ({ src: null, index: i })) : [];

    AV.Storage.saveOrder({
      id: AV.Orders.nextId(),
      platform,
      itemId,
      title,
      status,
      sourceUrl: source || canonical,
      kakobuyUrl: AV.Parser.toKakoBuy(canonical, prefs.affcode),
      qc,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    closeAddModal();
    renderOrders();
    renderQC();
    renderDashboard();
    $("#saveOrderBtn").disabled = true;
    $("#saveOrderBtn").textContent = "✓ SAVED TO TRACKER";
    showView("orders");
    toast("ORDER ADDED TO TRACKER");
  });

  $$("[data-modal-close]").forEach((el) => el.addEventListener("click", closeAddModal));
  addModal.addEventListener("click", (e) => {
    if (e.target === addModal.querySelector(".lightbox-backdrop")) closeAddModal();
  });

  /* ================= QC LIGHTBOX ================= */

  const lb = $("#lightbox");
  const lbImg = $("#lbImg");
  const lbViewport = $("#lbViewport");
  let lbPhotos = [];
  let lbIndex = 0;
  let lbScale = 1;
  let lbTx = 0;
  let lbTy = 0;
  let panning = null;

  function lbApply() {
    lbImg.style.transform =
      "translate(calc(-50% + " + lbTx + "px), calc(-50% + " + lbTy + "px)) scale(" + lbScale + ")";
  }

  function lbReset() {
    lbScale = 1;
    lbTx = 0;
    lbTy = 0;
    lbApply();
  }

  function openLightbox(order, index) {
    const photos = (order.qc || []).map((p) => AV.Orders.qcSrc(order, p));
    if (!photos.length) {
      toast("NO QC PHOTOS FOR THIS ORDER", true);
      return;
    }
    lbPhotos = photos;
    lbIndex = Math.min(Math.max(0, index || 0), photos.length - 1);
    $("#lbOrderId").textContent = order.id;
    $("#lbTitle").textContent = order.title || "Untitled Item";
    lbImg.src = photos[0];
    lbReset();
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    updateLbCounter();
  }

  function closeLightbox() {
    lb.hidden = true;
    document.body.style.overflow = "";
    lbImg.removeAttribute("src");
    lbPhotos = [];
  }

  function updateLbCounter() {
    $("#lbCounter").textContent = (lbIndex + 1) + " / " + lbPhotos.length;
    $("#lbPrev").disabled = lbPhotos.length < 2;
    $("#lbNext").disabled = lbPhotos.length < 2;
  }

  function lbStep(dir) {
    if (lbPhotos.length < 2) return;
    lbIndex = (lbIndex + dir + lbPhotos.length) % lbPhotos.length;
    lbImg.src = lbPhotos[lbIndex];
    lbReset();
    updateLbCounter();
  }

  function lbZoom(factor) {
    lbScale = Math.min(8, Math.max(1, lbScale * factor));
    lbApply();
  }

  $("#lbClose").addEventListener("click", closeLightbox);
  $(".lightbox-backdrop", lb).addEventListener("click", closeLightbox);
  $("#lbPrev").addEventListener("click", () => lbStep(-1));
  $("#lbNext").addEventListener("click", () => lbStep(1));
  $("#lbZoomIn").addEventListener("click", () => lbZoom(1.3));
  $("#lbZoomOut").addEventListener("click", () => lbZoom(1 / 1.3));
  $("#lbZoomReset").addEventListener("click", lbReset);

  lbViewport.addEventListener("wheel", (e) => {
    if (!lb.hidden) {
      e.preventDefault();
      lbZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    }
  }, { passive: false });

  lbViewport.addEventListener("pointerdown", (e) => {
    if (lbScale <= 1) return;
    panning = { x: e.clientX - lbTx, y: e.clientY - lbTy };
    lbViewport.classList.add("dragging");
    lbViewport.setPointerCapture(e.pointerId);
  });

  lbViewport.addEventListener("pointermove", (e) => {
    if (!panning) return;
    lbTx = e.clientX - panning.x;
    lbTy = e.clientY - panning.y;
    lbApply();
  });

  ["pointerup", "pointercancel"].forEach((ev) =>
    lbViewport.addEventListener(ev, () => {
      panning = null;
      lbViewport.classList.remove("dragging");
    })
  );

  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    switch (e.key) {
      case "Escape":
        closeLightbox();
        break;
      case "ArrowLeft":
        lbStep(-1);
        break;
      case "ArrowRight":
        lbStep(1);
        break;
      case "+":
      case "=":
        lbZoom(1.3);
        break;
      case "-":
      case "_":
        lbZoom(1 / 1.3);
        break;
      case "0":
        lbReset();
        break;
    }
  });

  /* ================= DASHBOARD ================= */

  function renderDashboard() {
    const list = AV.Storage.getOrders() || [];
    const count = (s) => list.filter((o) => o.status === s).length;
    const total = list.length;

    $("#dashStats").innerHTML =
      '<span class="mono-tag">' + String(total).padStart(2, "0") + " ORDERS</span>" +
      '<span class="mono-tag">' + String(count("qc")).padStart(2, "0") + " IN QC</span>" +
      '<span class="mono-tag">' + String(count("shipped")).padStart(2, "0") + " SHIPPED</span>";

    const recent = list.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 4);
    $("#dashRecent").innerHTML = recent.length
      ? recent
          .map(
            (o) =>
              '<div class="order-mini">' +
              '<img class="order-mini-thumb" src="' + AV.Orders.thumbSrc(o) + '" alt="" loading="lazy" />' +
              '<div class="order-mini-info">' +
              '<p class="order-mini-title">' + (o.title || "Untitled Item").replace(/"/g, "&quot;") + "</p>" +
              '<span class="order-mini-id">' + o.id + " · " + AV.Orders.statusLabel(o.status) + "</span>" +
              "</div>" +
              '<span class="status-tag status-' + o.status + '">' + AV.Orders.statusLabel(o.status).split(" ")[0] + "</span>" +
              "</div>"
          )
          .join("")
      : '<p class="field-help">No orders yet — convert a link or add one.</p>';

    const pipeline = AV.Orders.STATUSES.map((s) => {
      const n = count(s.id);
      const pct = total ? Math.round((n / total) * 100) : 0;
      return (
        '<div class="pipe-row">' +
        '<span class="pipe-label">' + s.label + "</span>" +
        '<div class="pipe-track"><div class="pipe-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="pipe-count">' + n + "</span>" +
        "</div>"
      );
    }).join("");
    $("#dashPipeline").innerHTML = total ? pipeline : '<p class="field-help">Pipeline empty.</p>';

    $("#sysOrders").textContent = String(total).padStart(2, "0") + " ORDERS";
  }

  /* ================= SETTINGS ================= */

  const prefsEls = {
    affcode: $("#setAffcode"),
    sessionToken: $("#setToken"),
    proxyUrl: $("#setProxy"),
    autoCopy: $("#setAutoCopy"),
    grid: $("#setGrid"),
  };

  function loadSettings() {
    const p = AV.Storage.getPrefs();
    prefsEls.affcode.value = p.affcode || "";
    prefsEls.sessionToken.value = p.sessionToken || "";
    prefsEls.proxyUrl.value = p.proxyUrl || "";
    prefsEls.autoCopy.checked = !!p.autoCopy;
    prefsEls.grid.checked = !!p.grid;
    document.body.classList.toggle("grid-bg", !!p.grid);
  }

  prefsEls.affcode.addEventListener("input", () => {
    AV.Storage.setPrefs({ affcode: prefsEls.affcode.value.trim() });
  });
  prefsEls.autoCopy.addEventListener("change", () => {
    AV.Storage.setPrefs({ autoCopy: prefsEls.autoCopy.checked });
    toast("AUTO-COPY " + (prefsEls.autoCopy.checked ? "ON" : "OFF"));
  });
  prefsEls.grid.addEventListener("change", () => {
    AV.Storage.setPrefs({ grid: prefsEls.grid.checked });
    document.body.classList.toggle("grid-bg", prefsEls.grid.checked);
  });

  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([AV.Storage.exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auravault-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("BACKUP EXPORTED");
  });

  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = AV.Storage.importData(String(reader.result));
        loadSettings();
        renderOrders();
        renderQC();
        renderDashboard();
        toast("IMPORTED " + res.orders + " ORDERS");
      } catch (err) {
        toast("IMPORT FAILED: " + err.message, true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  $("#clearBtn").addEventListener("click", () => {
    if (!confirm("Wipe ALL AuraVault data (orders + preferences) from this browser?")) return;
    AV.Storage.clearAll();
    AV.Orders.ensureInit();
    loadSettings();
    renderOrders();
    renderQC();
    renderDashboard();
    toast("ALL DATA WIPED");
  });

  /* ================= KAKOBUY INTEGRATION ================= */

  function fmtSyncTime(ts) {
    if (!ts) return "never";
    return new Date(ts).toLocaleString();
  }

  function renderKbStatus() {
    const connected = AV.KakoBuy.isConnected();
    const verified = !!(AV.Storage.getPrefs().kbVerified && connected);
    const linked = connected && verified;

    $("#topbarKb").textContent = "KAKOBUY: " + (linked ? "LINKED" : connected ? "VERIFY" : "OFFLINE");
    $("#topbarKb").classList.toggle("linked", linked);
    $("#sysKb").textContent = linked ? "LINKED" : "OFFLINE";
    $("#kbConnBadge").textContent = linked ? "LINKED" : connected ? "VERIFY" : "OFFLINE";
    $("#kbConnBadge").classList.toggle("linked", linked);
    $("#kbConnDot").classList.toggle("linked", linked);
    $("#kbConnSub").textContent = linked
      ? "Linked to KakoBuy. Orders and QC photos sync from your session."
      : connected
        ? "Session saved — run TEST or SYNC NOW to verify it."
        : "Not connected — orders & QC stay local until you link a KakoBuy session.";
    $("#kbStatus").textContent =
      "Last sync: " + fmtSyncTime(AV.Storage.getPrefs().lastSync) +
      (linked && !AV.Storage.getPrefs().lastSync ? " (connect and sync to pull your orders)" : "");

    ["#ordersSyncBtn", "#dashSyncBtn"].forEach((sel) => {
      $(sel).hidden = !connected;
    });
    $("#kbDisconnectBtn").disabled = !connected;
    $("#kbTestBtn").disabled = !connected;
    $("#kbSyncBtn").disabled = !connected;
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    btn.disabled = busy;
    if (label !== undefined) btn.textContent = label;
  }

  async function runKbSync(opts) {
    if (!AV.KakoBuy.isConnected()) {
      toast("CONNECT TO KAKOBUY FIRST", true);
      return;
    }
    const label = opts && opts.label;
    setBusy($("#kbSyncBtn"), true, label || "SYNCING…");
    setBusy($("#ordersSyncBtn"), true, label || "⟳ SYNC…");
    setBusy($("#dashSyncBtn"), true, label || "⟳ SYNC…");
    try {
      const res = await AV.KakoBuy.syncOrders();
      // Best-effort QC pull for any synced order that has a KakoBuy id.
      const local = AV.Storage.getOrders() || [];
      const kbOrders = local.filter((o) => o.kakobuyOrderId);
      let qcAttached = 0;
      for (const o of kbOrders) {
        qcAttached += await AV.KakoBuy.syncQC(o);
      }
      AV.Storage.setPrefs({ kbVerified: true });
      renderOrders();
      renderQC();
      renderDashboard();
      renderKbStatus();
      toast(
        "SYNC OK · +" + res.added + " NEW, " + res.updated + " UPDATED" +
        (qcAttached ? " · " + qcAttached + " QC PHOTOS" : "")
      );
    } catch (err) {
      AV.Storage.setPrefs({ kbVerified: false });
      renderKbStatus();
      toast("SYNC FAILED: " + err.message, true);
    } finally {
      setBusy($("#kbSyncBtn"), false);
      setBusy($("#ordersSyncBtn"), false);
      setBusy($("#dashSyncBtn"), false);
    }
  }

  async function runKbTest() {
    if (!AV.KakoBuy.isConnected()) {
      toast("PASTE A SESSION COOKIE FIRST", true);
      return;
    }
    setBusy($("#kbTestBtn"), true, "TESTING…");
    try {
      const res = await AV.KakoBuy.test();
      AV.Storage.setPrefs({ kbVerified: true });
      renderKbStatus();
      toast("KAKOBUY LINKED" + (res.account && res.account.name ? " — " + res.account.name : ""));
    } catch (err) {
      AV.Storage.setPrefs({ kbVerified: false });
      renderKbStatus();
      toast("CONNECTION FAILED: " + err.message, true);
    } finally {
      setBusy($("#kbTestBtn"), false);
    }
  }

  prefsEls.sessionToken.addEventListener("input", () => {
    AV.Storage.setPrefs({ sessionToken: prefsEls.sessionToken.value, kbVerified: false });
    renderKbStatus();
  });
  prefsEls.proxyUrl.addEventListener("input", () => {
    AV.Storage.setPrefs({ proxyUrl: prefsEls.proxyUrl.value.trim() });
  });

  $("#kbConnectBtn").addEventListener("click", () => {
    const token = prefsEls.sessionToken.value.trim();
    AV.Storage.setPrefs({
      sessionToken: token,
      proxyUrl: prefsEls.proxyUrl.value.trim(),
      kbVerified: false,
    });
    if (!token) {
      toast("PASTE A SESSION COOKIE FIRST", true);
      renderKbStatus();
      return;
    }
    runKbTest();
  });
  $("#kbTestBtn").addEventListener("click", runKbTest);
  $("#kbSyncBtn").addEventListener("click", () => runKbSync({ label: "SYNCING…" }));
  $("#ordersSyncBtn").addEventListener("click", () => runKbSync({ label: "⟳ SYNC…" }));
  $("#dashSyncBtn").addEventListener("click", () => runKbSync({ label: "⟳ SYNC…" }));
  $("#kbDisconnectBtn").addEventListener("click", () => {
    if (!confirm("Disconnect the KakoBuy session and clear the stored cookie?")) return;
    AV.KakoBuy.disconnect();
    prefsEls.sessionToken.value = "";
    renderKbStatus();
    toast("KAKOBUY DISCONNECTED");
  });

  /* ================= INIT ================= */

  AV.Storage.migrate();
  AV.Orders.ensureInit();
  loadSettings();
  $("#sysVersion").textContent = "v1.0.0";
  renderKbStatus();
  route();

  // Silent auto-sync on load when a session is already linked.
  if (AV.KakoBuy.isConnected() && AV.Storage.getPrefs().kbVerified) {
    runKbSync();
  }
})();
