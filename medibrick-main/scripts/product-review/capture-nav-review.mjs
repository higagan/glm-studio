/**
 * Captures navigation review screenshots (6 states × desktop/mobile).
 * Usage: node scripts/product-review/capture-nav-review.mjs [--base=http://localhost:5173]
 *
 * Requires dev server for role previews: npm run dev
 * Logged-out uses / ; authed roles use /dev/navigation-review?view=...
 */
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { ensureReportsDir, publishLatestReport, resolveReportsDir } from "./cursor-reports-path.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolveReportsDir(process.argv, "nav-review");
const BASE =
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "http://localhost:5173";

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = devices["iPhone 13"];

/** @type {{ id: string; path: string; name: string; openDrawer?: boolean }[]} */
const ROUTES = [
  { id: "01-logged-out", path: "/", name: "Logged out" },
  { id: "02-professional", path: "/dev/navigation-review?view=professional", name: "Professional" },
  { id: "03-hospital", path: "/dev/navigation-review?view=hospital", name: "Hospital" },
];

async function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function capture(browser, route, variant) {
  const isMobile = variant === "mobile";
  const context = await browser.newContext({
    viewport: isMobile ? MOBILE.viewport : DESKTOP,
    userAgent: isMobile ? MOBILE.userAgent : undefined,
    deviceScaleFactor: isMobile ? MOBILE.deviceScaleFactor : 1,
    isMobile,
    hasTouch: isMobile,
  });
  const page = await context.newPage();
  const url = `${BASE}${route.path}`;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(800);

    if (isMobile) {
      const menu = page.getByRole("button", { name: "Toggle menu" });
      if (await menu.isVisible().catch(() => false)) {
        await menu.click();
        await page.waitForTimeout(400);
      }
    }

    const file = path.join(OUT_ROOT, "screenshots", variant, `${route.id}.png`);
    await ensureDir(path.dirname(file));
    await page.screenshot({ path: file, fullPage: false });
    return { ...route, variant, url, file, ok: true };
  } catch (err) {
    return { ...route, variant, url, ok: false, error: String(err) };
  } finally {
    await context.close();
  }
}

async function main() {
  console.log(`Capturing navigation review screenshots from ${BASE}`);
  ensureReportsDir(OUT_ROOT);
  await ensureDir(path.join(OUT_ROOT, "screenshots", "desktop"));
  await ensureDir(path.join(OUT_ROOT, "screenshots", "mobile"));

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const route of ROUTES) {
    for (const variant of ["desktop", "mobile"]) {
      process.stdout.write(`  ${variant} ${route.id}… `);
      const result = await capture(browser, route, variant);
      results.push(result);
      console.log(result.ok ? "ok" : `FAIL: ${result.error}`);
    }
  }

  await browser.close();

  const manifestPath = path.join(OUT_ROOT, "manifest.json");
  const capturedAt = new Date().toISOString();
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ capturedAt, base: BASE, shots: results }, null, 2),
  );

  const ok = results.filter((r) => r.ok).length;
  const { indexPath, linkPath } = publishLatestReport(OUT_ROOT, "nav-review", {
    capturedAt,
    base: BASE,
    score: `${ok}/${results.length} screenshots`,
    summary: "Navigation review screenshots (logged out, professional, hospital × desktop/mobile).",
  });

  console.log(`\nDone. Latest: ${linkPath}/screenshots/`);
  console.log(`Index:  ${indexPath}`);
  console.log(`Run:    ${OUT_ROOT}/screenshots/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
