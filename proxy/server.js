/* ============================================================
   AURA//VAULT — local KakoBuy proxy (zero dependencies)
   ------------------------------------------------------------
   Mirrors netlify/functions/kakobuy.js for local testing:

       node proxy/server.js

   Then set Settings → KakoBuy Integration → Proxy Endpoint to:
       http://127.0.0.1:8787/kakobuy

   Uses the shared request crypto in netlify/functions/lib/crypto.js.
   Env overrides: PORT, KAKOBUY_BASE, KAKOBUY_EP_*, KAKOBUY_FP, KAKOBUY_UUID.
   ============================================================ */

const http = require("http");
const crypto = require("crypto");
const { buildRequest, decryptResponse } = require("../netlify/functions/lib/crypto.js");

const PORT = Number(process.env.PORT) || 8787;
const BASE = (process.env.KAKOBUY_BASE || "https://v1.kakoapi.com").replace(/\/+$/, "");
const ENDPOINTS = {
  test: process.env.KAKOBUY_EP_TEST || "/api/user/info",
  orders: process.env.KAKOBUY_EP_ORDERS || "/api/order/index",
  item: process.env.KAKOBUY_EP_ITEM || "/api/order/item",
  qc: process.env.KAKOBUY_EP_QC || "/api/order/item",
};

function randHex(n) {
  return crypto.randomBytes(n).toString("hex");
}

function pickArray(data) {
  return Array.isArray(data)
    ? data
    : Array.isArray(data && (data.list || data.orders || data.data))
      ? data.list || data.orders || data.data
      : [];
}

async function callApi(path, token, params) {
  const payload = Object.assign(
    {
      versionCode: "252",
      from: "1201",
      device_type: "web",
      fp: process.env.KAKOBUY_FP || randHex(16),
      referer: "https://www.kakobuy.com/",
      uuid: process.env.KAKOBUY_UUID || randHex(16),
      cur: "USD",
      token,
    },
    params || {}
  );

  const { body, keyHex, ivHex } = buildRequest(payload);

  let res;
  try {
    res = await fetch(BASE + path, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        lang: "en",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw { status: 502, message: "Could not reach KakoBuy API." };
  }

  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    /* non-JSON */
  }

  if (res.status === 451) {
    throw { status: 451, message: "KakoBuy is geo-blocking the proxy's region (HTTP 451)." };
  }
  if (!json || typeof json.code === "undefined") {
    throw { status: res.status || 502, message: "Unexpected KakoBuy response (HTTP " + res.status + ")." };
  }
  if (json.code === 200) return json.data;
  if (json.code === 202) {
    try {
      return decryptResponse(json.data, keyHex, ivHex);
    } catch (e) {
      throw { status: 502, message: "Failed to decrypt KakoBuy response." };
    }
  }
  const msg = json.msg || ("KakoBuy error code " + json.code);
  if (json.code === 1002) {
    throw { status: 401, message: "KakoBuy rejected the request (Illegal request) — token missing or invalid." };
  }
  if (/login/i.test(msg)) {
    throw { status: 401, message: "KakoBuy session expired — log into kakobuy.com and paste a fresh token." };
  }
  throw { status: 502, message: msg };
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Kakobuy-Token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  const respond = (status, body) => {
    res.writeHead(status);
    res.end(JSON.stringify(body));
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, "http://127.0.0.1");
  const action = (url.searchParams.get("action") || "test").toString();
  const token = (req.headers["x-kakobuy-token"] || "").trim();

  if (!token) {
    return respond(400, { ok: false, error: "No KakoBuy token provided." });
  }

  try {
    switch (action) {
      case "test": {
        const data = await callApi(ENDPOINTS.test, token);
        const account = data && typeof data === "object" ? data : null;
        return respond(200, {
          ok: true,
          action,
          account: account
            ? { name: account.name || account.nickname || account.username || null, id: account.id || account.uid || account.user_id || null }
            : null,
          raw: account,
        });
      }
      case "orders": {
        const data = await callApi(ENDPOINTS.orders, token);
        return respond(200, { ok: true, action, orders: pickArray(data), raw: data });
      }
      case "item": {
        const orderId = url.searchParams.get("orderId") || "";
        const data = await callApi(ENDPOINTS.item, token, { order_sn: orderId, id: orderId });
        return respond(200, { ok: true, action, orderId, item: data, raw: data });
      }
      case "qc": {
        const orderId = url.searchParams.get("orderId") || "";
        const data = await callApi(ENDPOINTS.qc, token, { order_sn: orderId, id: orderId });
        const photos = pickArray(data && (data.qc || data.qcList || data.qc_list || data.imageList || data.images));
        return respond(200, { ok: true, action, orderId, photos, raw: data });
      }
      default:
        return respond(400, { ok: false, error: "Unknown action: " + action });
    }
  } catch (err) {
    respond(err && err.status ? err.status : 502, {
      ok: false,
      error: (err && err.message) || "KakoBuy proxy error.",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const addr = server.address();
  const port = addr && addr.port ? addr.port : PORT;
  console.log("");
  console.log("  AURA//VAULT KakoBuy proxy running (v1.kakoapi.com, encrypted)");
  console.log("  → http://127.0.0.1:" + port + "/kakobuy");
  console.log("  Set Settings → KakoBuy Integration → Proxy Endpoint to:");
  console.log("  http://127.0.0.1:" + port + "/kakobuy");
  console.log("");
});
