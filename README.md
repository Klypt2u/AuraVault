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
placeholder `src: null` entries with real KakoBuy QC image URLs (e.g. from the
KakoBuy warehouse API) and the lightbox will render them at full resolution.
