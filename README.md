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
- Ships with demo seed orders so every screen is alive on first load.

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

### The honest constraints

KakoBuy has **no official public API and no OAuth**. Its web app talks to an
internal, undocumented JSON API authenticated by the browser session cookie,
and the site is **geo-blocked (HTTP 451)** in some regions. A static site cannot
read kakobuy.com's cookies (cross-origin / HttpOnly), and direct browser calls
to their internal API are blocked by CORS.

The only mechanism that works for third-party tools is what AuraVault implements:

1. You log into **kakobuy.com** in your browser and copy your session `Cookie`.
2. AuraVault stores it locally and sends it to its **own server-side proxy**
   (`netlify/functions/kakobuy.js`), which forwards requests to KakoBuy with
   your cookie. Server-side requests have no CORS, so this works.
3. Orders are pulled, mapped to AuraVault statuses, and merged into the tracker;
   QC photo URLs are attached to orders and shown in the lightbox.

### Connect a session

1. Deploy with Netlify Functions enabled (the `netlify/functions/` folder is
   auto-detected; locally run `netlify dev`).
2. Open **Settings → KakoBuy Integration** and paste your cookie:
   - Log into kakobuy.com → DevTools (F12) → **Network** → click any request →
     **Request Headers** → copy the full `Cookie:` value.
3. Click **CONNECT** (tests the session), then **SYNC NOW** to pull orders and QC.

Use **TEST** to verify a session, **DISCONNECT** to clear it, and the ⟳ SYNC
button on the Dashboard / Order Tracker to refresh. A linked session
auto-syncs on load. The cookie is stored only in this browser's localStorage.

### Confirming the undocumented endpoints

The internal endpoint paths live in one place — `ENDPOINTS` at the top of
`netlify/functions/kakobuy.js` — and can be overridden with env vars
(`KAKOBUY_BASE`, `KAKOBUY_EP_TEST`, `KAKOBUY_EP_ORDERS`, `KAKOBUY_EP_QC`).
They could not be verified from this build environment (geo-blocked). To
confirm, open kakobuy.com → DevTools → Network, click your order list / QC
requests, and note the paths + response shape, then update the endpoints and
`normalizeOrder` in `js/kakobuy.js` accordingly.

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
├── _redirects          # Netlify SPA fallback
└── netlify.toml        # Netlify config
```
