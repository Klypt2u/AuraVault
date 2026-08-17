# AURA//VAULT

A monochrome, high-tech **single-page command console** for the Taobao / Weidian / 1688 →
[KakoBuy](https://www.kakobuy.com) shopping pipeline. Convert product links, track orders,
and inspect warehouse QC photos — all in one place, with zero backend.

Built with **vanilla HTML + CSS + JavaScript**. No build step, no dependencies, no server.

---

## Features

### 🔗 Link Converter & Order Router
- Paste a **Taobao**, **Weidian**, or **1688** item link.
- AuraVault auto-detects the platform and parses the numeric **item ID**.
- Generates a real KakoBuy outlink:
  `https://www.kakobuy.com/item/details?url=<encoded-source>&affcode=<your-code>`
- One-click **open on KakoBuy**, copy the outlink, or save the item straight to the order tracker.

### 📦 Order Tracker & QC Photo Viewer
- Card grid of your orders with product thumbnail, platform, item ID, and a status tag:
  **Pending → Purchased → Arrived at Warehouse → QC Available → Shipped**.
- Change status inline from any card.
- **QC lightbox** with fullscreen preview, zoom (wheel / buttons / `+` `-` `0`),
  drag-to-pan while zoomed, prev/next navigation (`←` `→`), and `Esc` to close.
- Dedicated **QC Viewer** tab filters orders that have inspection photos.

### 💾 Local Storage
- Orders, preferences, KakoBuy affiliate code, and session token all persist in
  `localStorage` under the `auravault.*` keys — data survives refreshes and stays on-device.
- Export / import JSON backups and wipe data from **Settings**.
- Starts empty — no fake demo orders. Add your own or sync them from KakoBuy.

### 🌐 Netlify-ready
- `_redirects` + `netlify.toml` (`/* → /index.html 200`) so client-side routing never 404s on refresh.
- All assets use relative paths; the app is served as static files.

---

## Run locally

Any static server works (no build step):

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open <http://localhost:8080>.

To use the KakoBuy integration without deploying, also start the local proxy
in a second terminal:

```bash
node proxy/server.js   # → http://127.0.0.1:8787/kakobuy
```

and set **Settings → KakoBuy Integration → Proxy Endpoint** to that URL.

---

## Deploy to Netlify

1. Push this folder to a Git repo (or drag-and-drop the folder into the
   [Netlify Drop](https://app.netlify.com/drop) UI).
2. Netlify auto-detects a static site — **no build command, publish directory `/`**.
3. The included `_redirects` / `netlify.toml` handle client-side routing automatically.

---

## Project structure

```
├── index.html          # SPA shell: header, sidebar, 5 views, modals
├── css/styles.css      # Monochrome theme, glass cards, responsive layout
├── js/
│   ├── storage.js      # localStorage layer (prefs + orders)
│   ├── parser.js       # Taobao/Weidian/1688 parsing + KakoBuy outlink builder
│   ├── orders.js       # Order model, statuses, seed data, SVG placeholders
│   └── app.js          # Router, converter flow, QC lightbox, settings
├── _redirects          # Netlify SPA fallback
└── netlify.toml        # Netlify config
```

## Adding real QC photos

QC photos are stored per-order in the `qc` array as `{ src, index }`. Replace the
placeholder `src: null` entries with real KakoBuy QC image URLs (e.g. from a
KakoBuy sync) and the lightbox will render them at full resolution.

---

## KakoBuy integration (live orders + QC)

### How it works

KakoBuy has **no official public API**, but its web frontend was reverse-engineered
from the shipped bundle (`app.ce491532.js`). The real protocol AuraVault implements:

- **Host:** `https://v1.kakoapi.com`
- **Endpoints:** `/api/user/info`, `/api/order/index`, `/api/order/item`, …
- **Method:** `POST` with an **encrypted body**: `JSON → zlib.deflateRaw →
  AES-256-CBC → base64`, with the AES key/IV RSA-wrapped (1024-bit public key)
  and sent as `{ data, key, iv, req_code: 4 }`.
- **Auth:** your `token` cookie value, sent inside the encrypted payload.
- **Response:** `{ code, msg, data }` — `200` = ok, `202` = ok-but-encrypted.

This crypto is implemented in `netlify/functions/lib/crypto.js` and has been
**verified against the live API** (an invalid token now returns `please login
first` instead of the `Illegal request` you get from a badly-encrypted body).

Because a static site can't read kakobuy.com cookies (cross-origin / HttpOnly)
and direct browser calls would be CORS-blocked, requests go through a small
**server-side proxy** (a Netlify Function or the standalone `proxy/server.js`).

1. You log into **kakobuy.com** and copy your `token` cookie value.
2. AuraVault stores it locally and sends it to its own proxy.
3. The proxy encrypts + forwards to KakoBuy, decrypts the reply, and returns
   normalized JSON.
4. Orders are mapped to AuraVault statuses and merged into the tracker; QC
   photo URLs are attached and shown in the lightbox.

### Connect a session

1. Run a proxy (pick one):
   - **Netlify**: deploy with Functions enabled — `netlify/functions/` is
     auto-detected and served at `/.netlify/functions/kakobuy` (default).
   - **Locally**: `node proxy/server.js`, then set **Settings → KakoBuy
     Integration → Proxy Endpoint** to `http://127.0.0.1:8787/kakobuy`.
2. Open **Settings → KakoBuy Integration** and paste your token:
   - Log into kakobuy.com → DevTools (F12) → **Application** → Cookies →
     kakobuy.com → copy the value of the cookie named `token`.
3. Click **CONNECT** (tests the session), then **SYNC NOW** to pull orders and QC.

Use **TEST** to verify a session, **DISCONNECT** to clear it, and the ⟳ SYNC
button on the Dashboard / Order Tracker to refresh. A linked session
auto-syncs on load. The cookie is stored only in this browser's localStorage.

### What still needs a live session

The endpoints and encryption are confirmed; the only thing that needs one real
login is the **response field mapping** (what each order object is named). When
you sync successfully, look at the order JSON and adjust `normalizeOrder` in
`js/kakobuy.js` (and the `ENDPOINTS` env vars if paths ever change). The proxy
also returns the raw KakoBuy payload under `raw` to make this easy.

---

## Project structure

```
├── index.html          # SPA shell: header, sidebar, 5 views, modals
├── css/styles.css      # Monochrome theme, glass cards, responsive layout
├── js/
│   ├── storage.js      # localStorage layer (prefs + orders)
│   ├── parser.js       # Taobao/Weidian/1688 parsing + KakoBuy outlink builder
│   ├── orders.js       # Order model, statuses, seed data, SVG placeholders
│   ├── kakobuy.js      # KakoBuy client: connect/test/sync, merge, QC attach
│   └── app.js          # Router, converter flow, QC lightbox, settings
├── netlify/functions/kakobuy.js  # Server-side KakoBuy proxy (session cookie)
├── proxy/server.js     # Standalone local proxy (no Netlify needed)
├── _redirects          # Netlify SPA fallback
└── netlify.toml        # Netlify config
```
