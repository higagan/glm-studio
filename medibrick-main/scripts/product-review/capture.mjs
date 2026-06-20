/**
 * Captures desktop + mobile screenshots for external UX/product review.
 * Usage: node scripts/product-review/capture.mjs [--base=https://medibrick.com]
 */
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env for Supabase slug discovery fallback
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
const OUT_ROOT = path.resolve(__dirname, "../../docs/product-review/screenshots");
const BASE = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "https://medibrick.com";

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = devices["iPhone 13"];

/** @type {{ id: string; path: string; name: string; section: string; wait?: number; setup?: (page: import('playwright').Page) => Promise<void> }[]} */
const STATIC_ROUTES = [
  { id: "01-home", path: "/", name: "Homepage", section: "Marketing" },
  { id: "02-for-hospitals", path: "/for-hospitals", name: "For Hospitals", section: "Marketing" },
  { id: "03-for-professionals", path: "/for-professionals", name: "For Professionals", section: "Marketing" },
  { id: "04-how-it-works", path: "/how-it-works", name: "How It Works", section: "Marketing" },
  { id: "05-verification", path: "/verification-process", name: "Verification Process", section: "Marketing" },
  { id: "06-jobs-list", path: "/jobs", name: "Jobs listing", section: "Marketplace", wait: 3000 },
  { id: "07-jobs-landing-doctors", path: "/jobs/landing/doctors", name: "SEO landing — Doctors", section: "Marketplace" },
  { id: "08-nearby", path: "/nearby", name: "Nearby jobs", section: "Marketplace", wait: 2000 },
  { id: "09-blog", path: "/blog", name: "Blog index", section: "Content" },
  { id: "10-auth-main", path: "/auth", name: "Auth — entry", section: "Auth" },
  {
    id: "11-auth-phone",
    path: "/auth",
    name: "Auth — phone form",
    section: "Auth",
    setup: async (page) => {
      await page.getByRole("button", { name: /phone/i }).click();
      await page.waitForTimeout(500);
    },
  },
  { id: "12-complete-profile", path: "/complete-profile", name: "Complete profile (gate)", section: "Onboarding" },
  { id: "13-admin-login", path: "/admin/login", name: "Founder admin login", section: "Admin" },
  { id: "14-not-found", path: "/this-page-does-not-exist", name: "404", section: "System" },
];

async function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page, filePath) {
  await ensureDir(path.dirname(filePath));
  await page.screenshot({ path: filePath, fullPage: true });
}

async function discoverDynamicRoutes(page) {
  const dynamic = [];

  // Try DOM discovery on /jobs first
  await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);

  let jobSlug = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m = href.match(/\/jobs\/([a-z0-9-]+)/i);
      if (m && !["landing"].includes(m[1]) && !m[1].startsWith("landing")) return m[1];
    }
    return null;
  });

  let hospitalSlug = null;

  // Fallback: Supabase public API (anon key from env)
  if (!jobSlug && process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const res = await fetch(
        `${process.env.VITE_SUPABASE_URL}/rest/v1/job_posts?select=slug,hospital_profiles(slug)&status=eq.open&limit=1`,
        {
          headers: {
            apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      const rows = await res.json();
      if (rows?.[0]?.slug) {
        jobSlug = rows[0].slug;
        hospitalSlug = rows[0].hospital_profiles?.slug ?? null;
      }
    } catch {
      /* ignore */
    }
  }

  if (jobSlug) {
    dynamic.push({
      id: "15-job-detail",
      path: `/jobs/${jobSlug}`,
      name: `Job detail — ${jobSlug}`,
      section: "Marketplace",
      wait: 3000,
    });
  }

  if (!hospitalSlug && jobSlug) {
    await page.goto(`${BASE}/jobs/${jobSlug}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);
    hospitalSlug = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/hospitals/"]'));
      const href = links[0]?.getAttribute("href") || "";
      const m = href.match(/\/hospitals\/([a-z0-9-]+)/i);
      return m?.[1] ?? null;
    });
  }

  if (hospitalSlug) {
    dynamic.push({
      id: "16-hospital-profile",
      path: `/hospitals/${hospitalSlug}`,
      name: `Hospital profile — ${hospitalSlug}`,
      section: "Marketplace",
      wait: 2500,
    });
  }

  await page.goto(`${BASE}/blog`, { waitUntil: "networkidle", timeout: 60000 });
  const blogSlug = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/blog/"]'));
    const href = links[0]?.getAttribute("href") || "";
    const m = href.match(/\/blog\/([a-z0-9-]+)/i);
    return m?.[1] ?? null;
  });
  if (blogSlug) {
    dynamic.push({
      id: "17-blog-post",
      path: `/blog/${blogSlug}`,
      name: `Blog post — ${blogSlug}`,
      section: "Content",
      wait: 1500,
    });
  }

  return dynamic;
}

async function captureRoute(browser, route, viewport, variant) {
  const context = await browser.newContext({
    viewport: viewport === "desktop" ? DESKTOP : MOBILE.viewport,
    userAgent: viewport === "mobile" ? MOBILE.userAgent : undefined,
    deviceScaleFactor: viewport === "mobile" ? MOBILE.deviceScaleFactor : 1,
    isMobile: viewport === "mobile",
    hasTouch: viewport === "mobile",
  });
  const page = await context.newPage();
  const url = `${BASE}${route.path}`;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    if (route.wait) await page.waitForTimeout(route.wait);
    if (route.setup) await route.setup(page);
    const file = path.join(OUT_ROOT, viewport, `${route.id}.png`);
    await screenshot(page, file);
    return { ...route, url, viewport, file: `screenshots/${viewport}/${route.id}.png`, ok: true };
  } catch (err) {
    return { ...route, url, viewport, ok: false, error: String(err) };
  } finally {
    await context.close();
  }
}

async function main() {
  console.log(`Capturing MediBricks review screenshots from ${BASE}`);
  await ensureDir(path.join(OUT_ROOT, "desktop"));
  await ensureDir(path.join(OUT_ROOT, "mobile"));

  const browser = await chromium.launch({ headless: true });
  const probe = await browser.newContext();
  const probePage = await probe.newPage();
  const dynamic = await discoverDynamicRoutes(probePage);
  await probe.close();

  const allRoutes = [...STATIC_ROUTES, ...dynamic];
  const manifest = [];

  for (const route of allRoutes) {
    for (const variant of ["desktop", "mobile"]) {
      process.stdout.write(`  ${variant} ${route.id}… `);
      const result = await captureRoute(browser, route, variant, variant);
      manifest.push(result);
      console.log(result.ok ? "ok" : `FAIL: ${result.error}`);
    }
  }

  await browser.close();

  const manifestPath = path.resolve(__dirname, "../../docs/product-review/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ capturedAt: new Date().toISOString(), base: BASE, routes: manifest }, null, 2));
  console.log(`\nDone. ${manifest.filter((m) => m.ok).length}/${manifest.length} screenshots saved to docs/product-review/screenshots/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
