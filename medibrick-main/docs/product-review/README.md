# MediBricks UX Review Package

Screenshot + brief package for external product advisors.

## Quick start

1. **Open the gallery:** `PACKAGE.html` in your browser (double-click or `open docs/product-review/PACKAGE.html`)
2. **Read the brief:** `ADVISOR_BRIEF.md` — product context, personas, journeys, 22 review questions
3. **Share with advisor:** zip the whole `docs/product-review/` folder

## Contents

```
docs/product-review/
├── PACKAGE.html          ← Visual gallery (start here)
├── ADVISOR_BRIEF.md      ← Written brief for the reviewer
├── manifest.json         ← Machine-readable capture log
├── screenshots/
│   ├── mobile/           ← iPhone 13 (primary persona)
│   └── desktop/          ← 1280×900
└── README.md
```

## Regenerate screenshots

Requires Node 18+ and Playwright (one-time Chromium download).

```sh
npm install --no-save playwright
npx playwright install chromium
node scripts/product-review/capture.mjs --base=https://medibrick.com
node scripts/product-review/build-gallery.mjs
```

Optional: capture from local dev:

```sh
node scripts/product-review/capture.mjs --base=http://localhost:8080
```

## What's not captured (needs login)

- Professional / hospital dashboard (`/dashboard`)
- Profile editor (`/profile`)
- Apply dialog + post-submit state
- Admin panel (`/admin`, `/admin/metrics`)

Schedule a live walkthrough or provide test credentials for a follow-up capture.

## Create a zip for email

```sh
cd docs && zip -r medibrick-ux-review.zip product-review/
```
