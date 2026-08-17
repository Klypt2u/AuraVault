/* ============================================================
   AURA//VAULT — link parser & KakoBuy router
   Parses item IDs from Taobao / Weidian / 1688 URLs and builds
   KakoBuy outlinks: https://www.kakobuy.com/item/details?url=…
   ============================================================ */

(function () {
  "use strict";

  const PLATFORMS = {
    taobao: {
      id: "taobao",
      label: "TAOBAO",
      detect: (h) => /(^|\.)taobao\.com$/i.test(h) || /(^|\.)tmall\.com$/i.test(h) || /(^|\.)tb\.cn$/i.test(h),
      parse: (url) => {
        // item.taobao.com/item.htm?id=123 | detail.tmall.com/item.htm?id=123
        const id = url.searchParams.get("id");
        if (id && /^\d+$/.test(id)) return id;
        // path style: /item/123.htm
        const m = url.pathname.match(/\/(?:item|i)\/(\d{5,})\.?htm/i);
        if (m) return m[1];
        return null;
      },
      canonical: (id) => "https://item.taobao.com/item.htm?id=" + id,
      note: "Short tb.cn links must be expanded to the full item URL first.",
    },

    weidian: {
      id: "weidian",
      label: "WEIDIAN",
      detect: (h) => /(^|\.)weidian\.com$/i.test(h),
      parse: (url) => {
        const id = url.searchParams.get("itemID");
        if (id && /^\d+$/.test(id)) return id;
        // item.weidian.com/<id>.html | weidian.com/item/<id>.html
        const m = url.pathname.match(/(\d{5,})\.html?$/i);
        if (m) return m[1];
        return null;
      },
      canonical: (id) => "https://weidian.com/item.html?itemID=" + id,
    },

    "1688": {
      id: "1688",
      label: "1688",
      detect: (h) => /(^|\.)1688\.com$/i.test(h),
      parse: (url) => {
        // detail.1688.com/offer/<id>.html
        const m = url.pathname.match(/\/offer\/(\d{5,})(?:\.html?)?/i);
        if (m) return m[1];
        // mobile: m.1688.com/offer/<id>.html
        const m2 = url.pathname.match(/\/(\d{5,})\.html?$/i);
        if (m2) return m2[1];
        return null;
      },
      canonical: (id) => "https://detail.1688.com/offer/" + id + ".html",
    },
  };

  const KAKOBUY_BASE = "https://www.kakobuy.com/item/details";

  /**
   * Parse a pasted link.
   * @returns {{platform, itemId, sourceUrl, canonicalUrl, note?} | {error, sourceUrl}}
   */
  function parse(raw) {
    const sourceUrl = String(raw || "").trim();
    if (!sourceUrl) return { error: "Paste a product link to begin." };

    let url;
    try {
      url = new URL(sourceUrl);
    } catch (e) {
      return { error: "That doesn't look like a valid URL.", sourceUrl };
    }

    if (!/^https?:$/.test(url.protocol)) {
      return { error: "Only http(s) links are supported.", sourceUrl };
    }

    const host = url.hostname.replace(/^www\./, "");
    const platform = Object.values(PLATFORMS).find((p) => p.detect(host));
    if (!platform) {
      return { error: "Unsupported source. Use a Taobao, Weidian, or 1688 item link.", sourceUrl, host };
    }

    const itemId = platform.parse(url);
    if (!itemId) {
      return {
        error: "Could not extract an item ID from this " + platform.label + " link.",
        sourceUrl,
        platform: platform.id,
        note: platform.note,
      };
    }

    return {
      platform: platform.id,
      platformLabel: platform.label,
      itemId,
      sourceUrl,
      canonicalUrl: platform.canonical(itemId),
      note: platform.note,
    };
  }

  /** Build the KakoBuy outlink for a parsed item. */
  function toKakoBuy(canonicalUrl, affcode) {
    const url = new URL(KAKOBUY_BASE);
    url.searchParams.set("url", canonicalUrl);
    const code = String(affcode || "").trim();
    if (code) url.searchParams.set("affcode", code);
    return url.toString();
  }

  function platformLabel(id) {
    const p = PLATFORMS[id];
    return p ? p.label : "UNKNOWN";
  }

  window.AV = window.AV || {};
  window.AV.Parser = {
    PLATFORMS,
    KAKOBUY_BASE,
    parse,
    toKakoBuy,
    platformLabel,
  };
})();
