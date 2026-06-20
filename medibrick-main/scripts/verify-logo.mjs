import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const OUT =
  process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ||
  path.join(root, "tmp/logo-verify");

const BASE = process.env.BASE_URL || "http://localhost:8081";

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);

// Full nav
await page.screenshot({ path: path.join(OUT, "01-nav-full.png") });

// Logo cropped from nav
const logo = page.locator("nav img[src*='logo-icon-transparent']").first();
const box = await logo.boundingBox();
if (box) {
  await page.screenshot({
    path: path.join(OUT, "02-logo-nav-crop.png"),
    clip: {
      x: Math.max(0, box.x - 12),
      y: Math.max(0, box.y - 12),
      width: box.width + 120,
      height: box.height + 24,
    },
  });
}

// Icon-only at 4x via isolated page
const iconHtml = `<!DOCTYPE html>
<html><head>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700&display=swap" rel="stylesheet">
<style>body{margin:0;padding:40px;background:#fff;display:flex;gap:40px;align-items:center}
.size{display:flex;flex-direction:column;align-items:center;gap:8px;font:12px sans-serif;color:#666}
</style></head><body>
${[32, 36, 44, 64]
  .map(
    (s) => `<div class="size"><img src="${BASE}/brand/logo-icon-transparent.png" width="${s}" height="${s}" style="object-fit:contain" />${s}px</div>`,
  )
  .join("")}
</body></html>`;

const iconPage = await browser.newPage({ viewport: { width: 600, height: 200 } });
await iconPage.setContent(iconHtml);
await iconPage.screenshot({ path: path.join(OUT, "03-icon-sizes.png") });

await browser.close();
console.log("logo verify →", OUT);
