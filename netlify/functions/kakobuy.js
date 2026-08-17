/* ============================================================
   AURA//VAULT — KakoBuy proxy (Netlify Function)
   ------------------------------------------------------------
   KakoBuy exposes no official public API and no OAuth. Its web
   app talks to an internal, undocumented JSON API authenticated
   by the browser session cookie. Because a static site cannot
   read those cookies (cross-origin + HttpOnly) and direct calls
   would be blocked by CORS, this function acts as a server-side
   proxy:

     1. The user logs into kakobuy.com and copies their session
        "Cookie" header from DevTools (see README / Settings).
     2. AuraVault sends that cookie to this function.
     3. This function forwards the request to KakoBuy on the
        server (no CORS), using the user's cookie verbatim.

   IMPORTANT: the internal endpoint paths below are NOT publicly
   documented and could not be verified from this build
   environment (kakobuy.com returns HTTP 451 geo-blocking). They
   are centralized here so they can be confirmed once from a
   live session (kakobuy.com → DevTools → Network tab) and, if
   needed, overridden via environment variables:

     KAKOBUY_BASE          base origin   (default https://www.kakobuy.com)
     KAKOBUY_EP_TEST       current-user  endpoint
     KAKOBUY_EP_ORDERS     order-list    endpoint
     KAKOBUY_EP_QC         order QC      endpoint
   ============================================================ */

const BASE = (process.env.KAKOBUY_BASE || "https://www.kakobuy.com").replace(/\/+$/, "");

// Endpoints are centralized; confirm against a live session and override here.
const ENDPOINTS = {
  test: process.env.KAKOBUY_EP_TEST || "/user/info",
  orders: process.env.KAKOBUY_EP_ORDERS || "/order/list",
  qc: process.env.KAKOBUY_EP_QC || "/order/qc",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Kakobuy-Token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

/**
 * Normalize KakoBuy's raw response into a stable shape the client
 * can consume regardless of KakoBuy's internal naming. Adjust the
 * field accessors here (or in the client's normalizeOrder) once the
 * real payload is seen.
 */
function normalizeOrders(raw) {
  const data = raw && (raw.data || raw.list || raw.orders || raw);
  const list = Array.isArray(data) ? data : [];
  return list;
}

async function forward(token, path, searchParams) {
  const url = new URL(BASE + path);
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
    headers: {
      // Forward the user's session cookie verbatim.
      Cookie: token,
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    /* not JSON */
  }

  if (res.status === 451) {
    throw { status: 451, message: "KakoBuy is geo-blocking the proxy's region (HTTP 451)." };
  }
  if (res.status === 401 || res.status === 403) {
    throw { status: res.status, message: "KakoBuy rejected the session cookie (expired or invalid)." };
  }
  if (!res.ok) {
    throw { status: res.status, message: "KakoBuy responded with HTTP " + res.status + "." };
  }

  return json;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const params = event.queryStringParameters || {};
  const action = (params.action || "test").toString();
  const token = (event.headers["x-kakobuy-token"] || "").trim();

  if (!token) {
    return respond(400, { ok: false, error: "No KakoBuy session cookie provided." });
  }

  try {
    switch (action) {
      case "test": {
        const json = await forward(token, ENDPOINTS.test);
        const account = json && (json.data || json.user || json);
        return respond(200, {
          ok: true,
          action,
          account: account
            ? { name: account.name || account.nickname || account.username || null, id: account.id || account.uid || null }
            : null,
        });
      }

      case "orders": {
        const json = await forward(token, ENDPOINTS.orders);
        return respond(200, { ok: true, action, orders: normalizeOrders(json), raw: json });
      }

      case "qc": {
        const orderId = params.orderId || "";
        const json = await forward(token, ENDPOINTS.qc, { orderId });
        const data = json && (json.data || json.list || json.qc || json);
        const photos = Array.isArray(data) ? data : [];
        return respond(200, { ok: true, action, orderId, photos, raw: json });
      }

      default:
        return respond(400, { ok: false, error: "Unknown action: " + action });
    }
  } catch (err) {
    const status = err && err.status ? err.status : 502;
    return respond(status, { ok: false, error: (err && err.message) || "KakoBuy proxy error." });
  }
};
