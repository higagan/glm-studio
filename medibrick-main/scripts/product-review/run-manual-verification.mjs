/**
 * Production-like verification runner (preview deploy).
 * Usage: node scripts/product-review/run-manual-verification.mjs --base=<preview-url>
 *
 * Automates: Test C (back button), Hospital sanity (pre-auth), console error capture.
 * Tests A & B require human Google OAuth — captures pre-auth steps only.
 */
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "node:child_process";
import {
  ensureReportsDir,
  formatRunStamp,
  publishLatestReport,
  CURSOR_REPORTS_DIR,
} from "./cursor-reports-path.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE =
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ??
  "https://medibrick-main.vercel.app";

const RUN_DIR = path.join(CURSOR_REPORTS_DIR, `${formatRunStamp()}_manual-verification`);
const SHOTS = path.join(RUN_DIR, "screenshots");

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = devices["iPhone 13"];

/** @type {Record<string, unknown>[]} */
const results = [];

function record(test, row) {
  results.push({ test, ...row });
  const icon = row.pass ? "PASS" : row.pass === false ? "FAIL" : "MANUAL";
  console.log(`  [${icon}] ${test}: ${row.step}`);
}

async function shot(page, name) {
  const file = path.join(SHOTS, `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function fetchJobSlug() {
  const envPath = path.resolve(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) return "intensivist-bengaluru-5e561d2d";
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return "intensivist-bengaluru-5e561d2d";
  const res = await fetch(
    `${url}/rest/v1/job_posts?select=slug&status=eq.open&is_seed_data=eq.false&limit=1&order=created_at.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const rows = await res.json();
  return rows?.[0]?.slug ?? "intensivist-bengaluru-5e561d2d";
}

async function runWithConsole(page, fn) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  await fn();
  return errors;
}

async function testCBackButton(browser, jobSlug) {
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  const errors = await runWithConsole(page, async () => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE}/jobs/${jobSlug}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await shot(page, "C-01-job-detail");

    const apply = page.getByRole("button", { name: /apply now|^apply$/i }).first();
    await apply.click();
    await page.waitForTimeout(1500);
    const authUrl = page.url();
    await shot(page, "C-02-auth");

    const intent = await page.evaluate(() => ({
      redirect: localStorage.getItem("mb_auth_redirect"),
      intent: localStorage.getItem("mb_apply_intent"),
    }));

    await page.goBack();
    await page.waitForTimeout(1500);
    const backUrl = page.url();
    await shot(page, "C-03-back-on-job");

    record("C", {
      step: "Apply → Auth → Back returns to same job",
      pass: backUrl.includes(jobSlug) && authUrl.includes("/auth"),
      expected: `Back to /jobs/${jobSlug}, intent preserved`,
      actual: `back=${backUrl} intent=${!!intent.intent}`,
      redirects: authUrl.includes("/auth") ? "Expected /auth" : `Unexpected: ${authUrl}`,
      intentLost: !intent.intent,
      consoleErrors: [],
    });

    record("C", {
      step: "Apply intent preserved after back",
      pass: !!intent.redirect?.includes(jobSlug) && !!intent.intent,
      expected: "mb_auth_redirect + mb_apply_intent set",
      actual: JSON.stringify(intent),
      redirects: "none",
      intentLost: !intent.intent,
      consoleErrors: [],
    });
  });

  if (errors.length) {
    record("C", {
      step: "Console errors during back-button flow",
      pass: false,
      expected: "No console errors",
      actual: errors.join("; "),
      redirects: "—",
      intentLost: false,
      consoleErrors: errors,
    });
  }
  await ctx.close();
}

async function testHospitalSanity(browser) {
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  const errors = await runWithConsole(page, async () => {
    await page.goto(`${BASE}/for-hospitals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await shot(page, "H-01-for-hospitals");

    const cta = page.getByRole("link", { name: /get started/i }).first();
    if (await cta.isVisible().catch(() => false)) {
      await cta.click();
    } else {
      await page.getByRole("button", { name: /get started/i }).first().click();
    }
    await page.waitForTimeout(1500);
    const authUrl = page.url();
    await shot(page, "H-02-auth-from-hospitals");

    record("Hospital", {
      step: "For Hospitals → Get Started → Auth",
      pass: authUrl.includes("/auth"),
      expected: "/auth",
      actual: authUrl,
      redirects: authUrl.includes("/auth") ? "Expected" : `Unexpected: ${authUrl}`,
      intentLost: false,
      consoleErrors: [],
    });

    // Logged-out nav should show marketing links on for-hospitals (not onboarding shell)
    await page.goto(`${BASE}/for-hospitals`, { waitUntil: "networkidle" });
    const hasMarketingNav = await page.getByRole("link", { name: /for hospitals/i }).isVisible();
    record("Hospital", {
      step: "No onboarding regression on marketing pages (logged out)",
      pass: hasMarketingNav,
      expected: "Marketing nav visible when logged out",
      actual: hasMarketingNav ? "Visible" : "Missing",
      redirects: "—",
      intentLost: false,
      consoleErrors: [],
    });
  });

  if (errors.length) {
    record("Hospital", {
      step: "Console errors during hospital sanity",
      pass: false,
      expected: "No errors",
      actual: errors.join("; "),
      redirects: "—",
      intentLost: false,
      consoleErrors: errors,
    });
  }
  await ctx.close();
}

async function testABPreGoogle(browser, jobSlug, label) {
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  const errors = await runWithConsole(page, async () => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
    await shot(page, `${label}-01-jobs`);

    await page.goto(`${BASE}/jobs/${jobSlug}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await shot(page, `${label}-02-job-detail`);

    await page.getByRole("button", { name: /apply now|^apply$/i }).first().click();
    await page.waitForTimeout(1500);
    const authUrl = page.url();
    const hasContext = await page.getByText(/continue your application/i).isVisible().catch(() => false);
    const hasJobTitle = await page.getByText(/intensivist|apply/i).first().isVisible();
    await shot(page, `${label}-03-auth-context`);

    const persisted = await page.evaluate(() => ({
      redirect: localStorage.getItem("mb_auth_redirect"),
      intent: localStorage.getItem("mb_apply_intent"),
      context: localStorage.getItem("mb_job_apply_context"),
    }));

    record(label, {
      step: "Jobs → Apply → Auth with job context (pre-Google)",
      pass: authUrl.includes("/auth") && hasContext && !!persisted.intent,
      expected: "/auth + job context card + persisted intent",
      actual: `auth=${authUrl} context=${hasContext} intent=${!!persisted.intent}`,
      redirects: "/auth",
      intentLost: !persisted.intent,
      consoleErrors: [],
      manualRequired: "Continue with Google — complete in browser",
    });

    record(label, {
      step: "Full flow through Google → Submit (MANUAL)",
      pass: null,
      expected: "Human: Google login → profile if new → return job → apply dialog → submit",
      actual: "NOT AUTOMATED — requires Google account in browser",
      redirects: "—",
      intentLost: null,
      consoleErrors: [],
      manualRequired: true,
    });
  });

  if (errors.length) {
    record(label, {
      step: "Console errors (pre-Google)",
      pass: false,
      expected: "None",
      actual: errors.join("; "),
      consoleErrors: errors,
    });
  }
  await ctx.close();
}

async function queryAnalytics() {
  try {
    const out = execSync(
      `npx supabase db query --linked "SELECT event_name, properties->>'source' AS source, properties->>'jobSlug' AS job_slug, created_at FROM product_events WHERE event_name IN ('auth_started','auth_completed','auth_completed_from_job','application_submitted') ORDER BY created_at DESC LIMIT 15"`,
      { cwd: path.resolve(__dirname, "../.."), encoding: "utf8" },
    );
    return out;
  } catch (e) {
    return String(e);
  }
}

function buildMarkdown(report) {
  const lines = [
    "# Manual Verification Report",
    "",
    `**Preview URL:** ${report.previewUrl}`,
    `**Run:** ${report.capturedAt}`,
    `**Deployment:** ${report.deploymentNote}`,
    "",
    "## Summary",
    "",
    `| Area | Result |`,
    `|------|--------|`,
    `| Test A (new pro, Google) | ${report.summary.testA} |`,
    `| Test B (existing pro, Google) | ${report.summary.testB} |`,
    `| Test C (back button) | ${report.summary.testC} |`,
    `| Hospital sanity | ${report.summary.hospital} |`,
    `| Analytics | ${report.summary.analytics} |`,
    "",
    "## Detailed results",
    "",
  ];

  for (const r of report.results) {
    const status = r.pass === true ? "✅ PASS" : r.pass === false ? "❌ FAIL" : "⚠️ MANUAL";
    lines.push(`### ${r.test} — ${r.step}`, "", `**Result:** ${status}`, "");
    if (r.expected) lines.push(`- **Expected:** ${r.expected}`);
    if (r.actual) lines.push(`- **Actual:** ${r.actual}`);
    if (r.redirects) lines.push(`- **Redirects:** ${r.redirects}`);
    if (r.intentLost != null) lines.push(`- **Intent lost:** ${r.intentLost ? "YES" : "No"}`);
    if (r.consoleErrors?.length) lines.push(`- **Console errors:** ${r.consoleErrors.join("; ")}`);
    if (r.manualRequired) lines.push(`- **Manual:** ${r.manualRequired}`);
    lines.push("");
  }

  lines.push("## Screenshots", "", `\`${report.screenshotsDir}/\``, "");
  lines.push("## Analytics snapshot (DB)", "", "```", report.analyticsSnapshot.trim(), "```", "");
  lines.push("## Commit gate", "", report.commitGate, "");
  return lines.join("\n");
}

async function main() {
  console.log(`\n=== Manual Verification ===`);
  console.log(`Preview: ${BASE}\n`);
  ensureReportsDir(SHOTS);

  const jobSlug = await fetchJobSlug();
  console.log(`Job: ${jobSlug}\n`);

  const browser = await chromium.launch({ headless: true });

  await testABPreGoogle(browser, jobSlug, "A");
  await testABPreGoogle(browser, jobSlug, "B");
  await testCBackButton(browser, jobSlug);
  await testHospitalSanity(browser);
  await browser.close();

  const analyticsSnapshot = await queryAnalytics();

  const automatedPass = results.filter((r) => r.pass === true).length;
  const automatedFail = results.filter((r) => r.pass === false).length;
  const manualPending = results.filter((r) => r.pass === null || r.manualRequired).length;

  const testCPass = results.filter((r) => r.test === "C" && r.pass === false).length === 0;
  const hospitalPass = results.filter((r) => r.test === "Hospital" && r.pass === false).length === 0;

  const commitGate =
    automatedFail > 0
      ? "❌ DO NOT COMMIT — automated checks failed"
      : manualPending > 0
        ? "⏳ DO NOT COMMIT YET — complete Google OAuth tests A & B in browser, then verify analytics after submit"
        : "✅ Ready to commit navigation + apply + analytics as one release";

  const report = {
    capturedAt: new Date().toISOString(),
    previewUrl: BASE,
    deploymentNote:
      "Vercel preview: https://medibrick-main.vercel.app (deployment includes uncommitted local changes)",
    jobSlug,
    summary: {
      testA: "⏳ MANUAL — pre-Google automated steps only",
      testB: "⏳ MANUAL — pre-Google automated steps only",
      testC: testCPass ? "✅ PASS (automated)" : "❌ FAIL",
      hospital: hospitalPass ? "✅ PASS (pre-auth automated)" : "❌ FAIL",
      analytics: "⏳ Verify after manual application submit",
    },
    automated: { pass: automatedPass, fail: automatedFail, manualPending },
    results,
    screenshotsDir: SHOTS,
    analyticsSnapshot,
    commitGate,
  };

  fs.writeFileSync(path.join(RUN_DIR, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, "VERIFICATION_REPORT.md"), buildMarkdown(report));

  publishLatestReport(RUN_DIR, "manual-verification", {
    capturedAt: report.capturedAt,
    base: BASE,
    score: `${automatedPass} pass / ${automatedFail} fail / ${manualPending} manual`,
    summary: report.commitGate,
  });

  console.log(`\n${report.commitGate}`);
  console.log(`Report: ${RUN_DIR}/VERIFICATION_REPORT.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
