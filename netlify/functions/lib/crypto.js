/* ============================================================
   AURA//VAULT — KakoBuy request crypto (shared)
   ------------------------------------------------------------
   Reverse-engineered from kakobuy.com's frontend bundle
   (app.ce491532.js). The KakoBuy API (https://v1.kakoapi.com)
   expects POST bodies encrypted as:

     1. params  → JSON.stringify
     2.         → zlib.deflateRaw(level 1)
     3.         → AES-256-CBC (PKCS#7), key = ASCII bytes of a
                32-char hex string, iv = ASCII bytes of a
                16-char hex string
     4.         → base64  (this becomes body.data)

   The AES key/iv hex strings are themselves RSA-encrypted
   (1024-bit public key, PKCS#1 v1.5) and sent as body.key and
   body.iv. The server echoes responses encrypted with the same
   key/iv when it answers with `code: 202`.

   Node's built-in crypto + zlib replicate CryptoJS exactly.
   ============================================================ */

const crypto = require("crypto");
const zlib = require("zlib");

// Hardcoded in the KakoBuy frontend (1024-bit RSA public key).
const PUBLIC_KEY =
  "-----BEGIN PUBLIC KEY-----\n" +
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCx2UKNVOg0dYx1R3p7GNAXcrRQ7QkiE43UFbHxLPJ8gpWFxhSb6ZoCGO/8AkAFEgroJ7NKUhRyq71vCjDFJh8n7zjA6rgIxKOPNwndHlXBLBj60avRb14BrunQ5EijwGpUF9jUeLrLO3GNd39T4l1RC0jjTBa0hpKpGNGfQAd7rwIDAQAB\n" +
  "-----END PUBLIC KEY-----\n";

function rsaEncrypt(utf8String) {
  return crypto
    .publicEncrypt(
      { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(utf8String, "utf8")
    )
    .toString("base64");
}

/**
 * Build an encrypted KakoBuy request body.
 * @param {object} params  request params (includes token, cur, device fields)
 * @returns {{body:object, keyHex:string, ivHex:string}} body to POST, plus the
 *          key/iv hex strings needed to decrypt a `code:202` response.
 */
function buildRequest(params) {
  // Matches the frontend: 16 random bytes → 32 hex chars (key),
  // 8 random bytes → 16 hex chars (iv). CryptoJS parses these hex
  // STRINGS as UTF-8, so the AES key is 32 bytes (AES-256) and the
  // IV is 16 bytes.
  const keyHex = crypto.randomBytes(16).toString("hex");
  const ivHex = crypto.randomBytes(8).toString("hex");

  const aesKey = Buffer.from(keyHex, "utf8");
  const aesIv = Buffer.from(ivHex, "utf8");

  const json = Buffer.from(JSON.stringify(params), "utf8");
  const deflated = zlib.deflateRawSync(json, { level: 1 });
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, aesIv);
  const data = Buffer.concat([cipher.update(deflated), cipher.final()]).toString("base64");

  return {
    body: {
      data,
      key: rsaEncrypt(keyHex),
      iv: rsaEncrypt(ivHex),
      req_code: 4,
    },
    keyHex,
    ivHex,
  };
}

/**
 * Decrypt a `code:202` response payload using the key/iv from the request.
 */
function decryptResponse(dataBase64, keyHex, ivHex) {
  const aesKey = Buffer.from(keyHex, "utf8");
  const aesIv = Buffer.from(ivHex, "utf8");
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, aesIv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataBase64, "base64")),
    decipher.final(),
  ]);
  const inflated = zlib.inflateRawSync(decrypted);
  return JSON.parse(inflated.toString("utf8"));
}

module.exports = { buildRequest, decryptResponse };
