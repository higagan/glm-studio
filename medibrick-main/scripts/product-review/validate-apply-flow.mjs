/**
 * End-to-end validation: Healthcare Professional Application Flow
 *
 * Usage:
 *   npm run dev
 *   node scripts/product-review/validate-apply-flow.mjs --base=http://localhost:8081
 *
 * Optional env (for Case 2 existing-user fast path):
 *   E2E_PRO_EMAIL=... E2E_PRO_PASSWORD=...
 */
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { ensureReportsDir, publishLatestReport, resolveReportsDir } from "./cursor-reports-path.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = resolveReportsDir(process.argv, "apply-flow-review");
const BASE =
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "http://localhost:8081";

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const DESKTOP = { width: 1280, height: 900 };
const MOBILE = devices["iPhone 13"];

/** @type {{ step: string; case: string; viewport: string; expected: string; actual: string; pass: boolean; events: string[]; ux: string[]; risks: string[]; severity?: string }[]} */
const results = [];
/** @type {{ event: string; props: Record<string, unknown>; at: string }[]} */
const allEvents = [];

function record(row) {
  results.push(row);
  const icon = row.pass ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${row.case} | ${row.viewport} | ${row.step}`);
  if (!row.pass) console.log(`         expected: ${row.expected}`);
  if (!row.pass) console.log(`         actual:   ${row.actual}`);
}

async function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function shot(page, name) {
  const file = path.join(OUT, "screenshots", `${name}.png`);
  await ensureDir(path.dirname(file));
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function analyticsInitScript() {
  window.__e2eEvents = [];
  const push = (event, props = {}, page = location.pathname) => {
    window.__e2eEvents.push({ event, props, page, at: new Date().toISOString() });
  };
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const [input, init] = args;
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/api/product-events") && init?.body) {
      try {
        const body = JSON.parse(init.body);
        push(body.event_name, body.properties || {}, body.page);
      } catch {
        /* ignore */
      }
    }
    return origFetch(...args);
  };
}

async function getEvents(page) {
  return page.evaluate(() => window.__e2eEvents || []);
}

async function clearEvents(page) {
  await page.evaluate(() => {
    window.__e2eEvents = [];
  });
}

async function waitForEvent(page, eventName, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const events = await getEvents(page);
    const hit = events.find((e) => e.event === eventName);
    if (hit) return hit;
    await page.waitForTimeout(250);
  }
  return null;
}

async function fetchOpenJob() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase
    .from("job_posts")
    .select("id, slug, title, shift_date, compensation, hospital_profiles(hospital_name)")
    .eq("status", "open")
    .eq("is_seed_data", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  if (!data?.length) throw new Error("No open non-seed jobs found");

  return data[0];
}

async function findUnappliedJob(supabase, professionalId) {
  const { data: jobs } = await supabase
    .from("job_posts")
    .select("id, slug, title")
    .eq("status", "open")
    .eq("is_seed_data", false)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!jobs?.length) return null;

  const { data: apps } = await supabase
    .from("applications")
    .select("job_id")
    .eq("professional_id", professionalId);

  const applied = new Set((apps || []).map((a) => a.job_id));
  return jobs.find((j) => !applied.has(j.id)) || jobs[0];
}

async function loginWithEmail(page, email, password) {
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /login \/ sign up with email/i }).click();
  await page.getByRole("button", { name: /^login$/i }).first().click();
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator('form').filter({ has: page.locator("#login-email") }).getByRole("button", { name: /^login$/i }).click();
  await page.waitForTimeout(4000);
}

async function signupFreshUser(page, email, password) {
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /login \/ sign up with email/i }).click();
  await page.locator("#signup-email").fill(email);
  await page.locator("#signup-password").fill(password);
  await page.locator("#confirm-password").fill(password);
  await page.locator('form').filter({ has: page.locator("#signup-email") }).getByRole("button", { name: /^sign up$/i }).click();
  await page.waitForTimeout(5000);
}

async function completeMinimalProfile(page, name = "E2E Test Professional") {
  await page.waitForURL(/complete-profile/, { timeout: 20000 }).catch(() => {});
  if (!page.url().includes("complete-profile")) return false;

  await page.locator("#name").fill(name);
  await page.locator("#license").fill("E2E-LIC-12345");
  await page.locator("#experience").fill("5");
  await page.getByRole("button", { name: /^complete profile$/i }).click();
  await page.waitForTimeout(5000);
  return true;
}

async function openJobAndClickApply(page, jobSlug) {
  await page.goto(`${BASE}/jobs/${jobSlug}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1500);
  const applyBtn = page.getByRole("button", { name: /apply now|^apply$/i }).first();
  await applyBtn.scrollIntoViewIfNeeded();
  await applyBtn.waitFor({ state: "visible", timeout: 20000 });
  await applyBtn.click();
  await page.waitForTimeout(1500);
}

async function readPersistedIntent(page) {
  return page.evaluate(() => ({
    redirect: localStorage.getItem("mb_auth_redirect"),
    pending: localStorage.getItem("mb_pending_apply"),
    intent: localStorage.getItem("mb_apply_intent"),
    context: localStorage.getItem("mb_job_apply_context"),
  }));
}

async function resetStorage(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function runCase1Partial(page, job, viewport, caseName) {
  const tag = `${caseName}-${viewport}`;
  await page.context().clearCookies();
  await resetStorage(page);

  // Browse Jobs
  await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const onJobs = page.url().includes("/jobs");
  record({
    step: "Browse Jobs",
    case: caseName,
    viewport,
    expected: "Jobs listing loads",
    actual: onJobs ? "On /jobs" : page.url(),
    pass: onJobs,
    events: (await getEvents(page)).map((e) => e.event),
    ux: [],
    risks: onJobs ? [] : ["Cannot start apply funnel without jobs list"],
  });
  await shot(page, `${tag}-01-browse-jobs`);

  // Open job detail
  await page.goto(`${BASE}/jobs/${job.slug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const jobViewed = await waitForEvent(page, "job_viewed");
  const onDetail = page.url().includes(job.slug);
  record({
    step: "Open Job Detail",
    case: caseName,
    viewport,
    expected: `Job detail at /jobs/${job.slug} + job_viewed event`,
    actual: `${page.url()} | job_viewed=${!!jobViewed}`,
    pass: onDetail && !!jobViewed,
    events: (await getEvents(page)).map((e) => e.event),
    ux: [],
    risks: [],
  });
  await shot(page, `${tag}-02-job-detail`);

  // Click Apply (logged out)
  await clearEvents(page);
  try {
    await openJobAndClickApply(page, job.slug);
  } catch (err) {
    record({
      step: "Click Apply → Auth",
      case: caseName,
      viewport,
      expected: "Apply button visible and navigates to auth",
      actual: String(err),
      pass: false,
      events: [],
      ux: ["Apply CTA not reachable"],
      risks: ["P0: Cannot start conversion funnel"],
      severity: "P0",
    });
    await shot(page, `${tag}-03-apply-failed`);
    return { persisted: await readPersistedIntent(page), onAuth: false, intentOk: false };
  }
  const onAuth = page.url().includes("/auth");
  const persisted = await readPersistedIntent(page);
  let intentOk = false;
  try {
    const parsed = JSON.parse(persisted.intent || "{}");
    intentOk = parsed.jobId === job.id && persisted.redirect?.includes(job.slug);
  } catch {
    intentOk = false;
  }

  const applyAuth = await waitForEvent(page, "apply_requires_auth");
  const applyClicked = await waitForEvent(page, "apply_clicked");

  record({
    step: "Click Apply → Auth",
    case: caseName,
    viewport,
    expected: "Redirect to /auth; job slug/id + return URL persisted",
    actual: `url=${page.url()} redirect=${persisted.redirect} jobId=${JSON.parse(persisted.intent || "{}").jobId || "?"}`,
    pass: onAuth && intentOk && !!applyAuth && !!applyClicked,
    events: (await getEvents(page)).map((e) => e.event),
    ux: onAuth ? [] : ["User may not understand why they left the job"],
    risks: !intentOk ? ["P0: Job context lost after Apply — conversion killer"] : [],
    severity: !intentOk ? "P0" : undefined,
  });
  await shot(page, `${tag}-03-auth-with-context`);

  const jobCardVisible = await page.getByText(job.title).first().isVisible().catch(() => false);
  record({
    step: "Auth shows job context card",
    case: caseName,
    viewport,
    expected: `"Continue your application" + job title visible`,
    actual: jobCardVisible ? `Shows "${job.title}"` : "Job summary card not found",
    pass: jobCardVisible,
    events: [],
    ux: jobCardVisible ? [] : ["Missing job context reduces trust on auth page"],
    risks: jobCardVisible ? [] : ["Users may abandon not knowing which shift they applied to"],
  });

  // Simulate post-auth return (cannot run Google OAuth in automation)
  record({
    step: "Login with Google",
    case: caseName,
    viewport,
    expected: "OAuth → return to same job with ?apply=resume",
    actual: "NOT AUTOMATED — requires manual Google OAuth in browser",
    pass: false,
    events: [],
    ux: [],
    risks: ["Google OAuth path unverified in this run — highest-traffic auth method"],
    severity: "P0",
  });

  return { persisted, onAuth, intentOk };
}

async function runCase1EmailCompletion(page, job, viewport, credentials) {
  const tag = `case1-email-${viewport}`;
  await page.context().clearCookies();
  await resetStorage(page);

  await openJobAndClickApply(page, job.slug);
  await signupFreshUser(page, credentials.email, credentials.password);

  const afterSignupUrl = page.url();
  const onCompleteOrJob =
    afterSignupUrl.includes("complete-profile") ||
    afterSignupUrl.includes(job.slug) ||
    afterSignupUrl.includes("apply=resume");

  record({
    step: "Email signup after Apply",
    case: "Case 1 (email path)",
    viewport,
    expected: "Session created → complete-profile OR return to job",
    actual: afterSignupUrl,
    pass: onCompleteOrJob,
    events: (await getEvents(page)).map((e) => e.event),
    ux: [],
    risks: !onCompleteOrJob ? ["Signup may require email confirmation — blocks apply funnel"] : [],
    severity: !onCompleteOrJob ? "P1" : undefined,
  });
  await shot(page, `${tag}-04-after-signup`);

  if (page.url().includes("complete-profile")) {
    await completeMinimalProfile(page);
    await page.waitForTimeout(3000);
    await shot(page, `${tag}-05-profile-complete`);
  }

  const landed = page.url();
  const returnedToJob = landed.includes(job.slug);
  record({
    step: "Return to same job after onboarding",
    case: "Case 1 (email path)",
    viewport,
    expected: `Land on /jobs/${job.slug} with apply=resume`,
    actual: landed,
    pass: returnedToJob || landed.includes("apply=resume"),
    events: (await getEvents(page)).map((e) => e.event),
    ux: [],
    risks: !returnedToJob ? ["User must manually find the job again"] : [],
    severity: !returnedToJob ? "P0" : undefined,
  });

  if (returnedToJob || landed.includes("apply=resume")) {
    await page.waitForTimeout(3000);
    const resumed = await waitForEvent(page, "apply_resumed_after_auth", 10000);
    const dialogOpen = await page.getByRole("dialog").isVisible().catch(() => false);

    record({
      step: "Apply dialog resumes after auth",
      case: "Case 1 (email path)",
      viewport,
      expected: "apply_resumed_after_auth + application dialog opens",
      actual: `resumed=${!!resumed} dialog=${dialogOpen}`,
      pass: !!resumed && dialogOpen,
      events: (await getEvents(page)).map((e) => e.event),
      ux: [],
      risks: [],
    });
    await shot(page, `${tag}-06-apply-dialog`);

    if (dialogOpen) {
      await page.getByRole("button", { name: /submit application/i }).click();
      await page.waitForTimeout(3000);
      const submitted = await waitForEvent(page, "application_submitted", 10000);
      const appliedLabel = await page.getByText(/applied|application submitted/i).first().isVisible().catch(() => false);

      record({
        step: "Submit application",
        case: "Case 1 (email path)",
        viewport,
        expected: "application_submitted + success UI",
        actual: `submitted=${!!submitted} successUI=${appliedLabel}`,
        pass: !!submitted && appliedLabel,
        events: (await getEvents(page)).map((e) => e.event),
        ux: [],
        risks: [],
      });
      await shot(page, `${tag}-07-submitted`);

      await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);
      const inDashboard = await page.getByText(job.title).first().isVisible().catch(() => false);
      record({
        step: "My Applications lists submission",
        case: "Case 1 (email path)",
        viewport,
        expected: `Job "${job.title}" visible on dashboard`,
        actual: inDashboard ? "Found" : "Not found in My Applications",
        pass: inDashboard,
        events: [],
        ux: [],
        risks: inDashboard ? [] : ["User cannot confirm application was received"],
        severity: inDashboard ? undefined : "P0",
      });
      await shot(page, `${tag}-08-my-applications`);
    }
  }
}

async function runCase2Existing(page, job, viewport, credentials, professionalId) {
  const tag = `case2-${viewport}`;
  await page.context().clearCookies();
  await resetStorage(page);

  await loginWithEmail(page, credentials.email, credentials.password);
  const loggedIn = !page.url().includes("/auth") || page.url().includes("/jobs") || page.url().includes("/dashboard");
  record({
    step: "Login existing professional",
    case: "Case 2",
    viewport,
    expected: "Authenticated → jobs or dashboard",
    actual: page.url(),
    pass: loggedIn,
    events: (await getEvents(page)).map((e) => e.event),
    ux: [],
    risks: [],
  });
  await shot(page, `${tag}-01-logged-in`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const targetJob = (await findUnappliedJob(supabase, professionalId)) || job;

  await page.goto(`${BASE}/jobs/${targetJob.slug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await clearEvents(page);
  await openJobAndClickApply(page, targetJob.slug);

  const dialogOpen = await page.getByRole("dialog").isVisible().catch(() => false);
  const started = await waitForEvent(page, "application_started", 8000);
  record({
    step: "Apply opens dialog (logged in)",
    case: "Case 2",
    viewport,
    expected: "application_started + dialog (no auth redirect)",
    actual: `dialog=${dialogOpen} onAuth=${page.url().includes("/auth")}`,
    pass: dialogOpen && !page.url().includes("/auth") && !!started,
    events: (await getEvents(page)).map((e) => e.event),
    ux: [],
    risks: [],
  });
  await shot(page, `${tag}-02-apply-dialog`);

  if (dialogOpen) {
    await page.getByRole("button", { name: /submit application/i }).click();
    await page.waitForTimeout(3000);
    const submitted = await waitForEvent(page, "application_submitted", 10000);
    record({
      step: "Submit application",
      case: "Case 2",
      viewport,
      expected: "application_submitted event",
      actual: submitted ? "application_submitted fired" : "Event missing",
      pass: !!submitted,
      events: (await getEvents(page)).map((e) => e.event),
      ux: [],
      risks: [],
    });
    await shot(page, `${tag}-03-success`);

    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const listed = await page.getByText(targetJob.title).first().isVisible().catch(() => false);
    record({
      step: "My Applications updates",
      case: "Case 2",
      viewport,
      expected: "New application visible",
      actual: listed ? "Visible" : "Not visible",
      pass: listed,
      events: [],
      ux: [],
      risks: [],
    });
    await shot(page, `${tag}-04-dashboard`);
  }
}

async function runBackButtonTest(page, job, viewport) {
  const tag = `back-button-${viewport}`;
  await page.context().clearCookies();
  await resetStorage(page);

  await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/jobs/${job.slug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await openJobAndClickApply(page, job.slug);
  const authUrl = page.url();
  await page.goBack();
  await page.waitForTimeout(1500);
  const backUrl = page.url();
  const stillOnJob = backUrl.includes(job.slug);
  const persisted = await readPersistedIntent(page);

  record({
    step: "Browser back after Apply→Auth",
    case: "Back button",
    viewport,
    expected: "Back returns to job detail; intent still persisted",
    actual: `back→${backUrl} intent=${!!persisted.intent}`,
    pass: stillOnJob && !!persisted.intent,
    events: [],
    ux: stillOnJob ? [] : ["Back button may trap user or lose place"],
    risks: !persisted.intent ? ["Re-apply may not resume correctly"] : [],
    severity: !persisted.intent ? "P1" : undefined,
  });
  await shot(page, `${tag}`);
}

async function verifyFounderEvents(recentEventNames) {
  const required = [
    "job_viewed",
    "apply_clicked",
    "apply_requires_auth",
    "application_submitted",
  ];
  const found = new Set(recentEventNames);
  const checks = required.map((e) => ({
    event: e,
    pass: found.has(e) || allEvents.some((x) => x.event === e),
  }));
  return checks;
}

async function queryRecentProductEvents() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("product_events")
    .select("event_name, created_at, properties, page")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.warn("Could not query product_events:", error.message);
    return [];
  }
  return data || [];
}

async function main() {
  console.log(`\n=== Apply Flow E2E Validation ===`);
  console.log(`Base: ${BASE}\n`);
  await ensureDir(path.join(OUT, "screenshots"));

  const job = await fetchOpenJob();
  console.log(`Using job: ${job.title} (${job.slug})\n`);

  const browser = await chromium.launch({ headless: true });
  const ts = Date.now();
  const testEmail = `e2e.apply.${ts}@example.com`;
  const testPassword = "E2eTest!99";

  async function newPageWithAnalytics(ctx) {
    await ctx.addInitScript(analyticsInitScript);
    return ctx.newPage();
  }

  // Desktop Case 1 partial + back button
  {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await newPageWithAnalytics(ctx);
    await runCase1Partial(page, job, "desktop", "Case 1");
    await runBackButtonTest(page, job, "desktop");
    allEvents.push(...(await getEvents(page)));
    await ctx.close();
  }

  // Mobile Case 1 partial
  {
    const ctx = await browser.newContext({
      ...MOBILE,
      viewport: MOBILE.viewport,
      userAgent: MOBILE.userAgent,
      isMobile: true,
      hasTouch: true,
    });
    const page = await newPageWithAnalytics(ctx);
    await runCase1Partial(page, job, "mobile", "Case 1");
    await runBackButtonTest(page, job, "mobile");
    allEvents.push(...(await getEvents(page)));
    await ctx.close();
  }

  // Case 1 email full path (desktop)
  {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await newPageWithAnalytics(ctx);
    try {
      await runCase1EmailCompletion(page, job, "desktop", {
        email: testEmail,
        password: testPassword,
      });
      allEvents.push(...(await getEvents(page)));
    } catch (e) {
      record({
        step: "Case 1 email full path",
        case: "Case 1",
        viewport: "desktop",
        expected: "Complete new-user apply funnel",
        actual: String(e),
        pass: false,
        events: [],
        ux: [],
        risks: ["Email signup path failed"],
        severity: "P0",
      });
    }
    await ctx.close();
  }

  // Case 2 existing user — try env creds or freshly created user
  let proEmail = process.env.E2E_PRO_EMAIL;
  let proPassword = process.env.E2E_PRO_PASSWORD;
  let professionalId = null;

  if (!proEmail) {
    // Re-use account if email signup succeeded
    proEmail = testEmail;
    proPassword = testPassword;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: proEmail,
    password: proPassword,
  });

  if (signInData?.user) {
    const { data: prof } = await supabase
      .from("professional_profiles")
      .select("id")
      .eq("user_id", signInData.user.id)
      .maybeSingle();
    professionalId = prof?.id;

    for (const viewport of ["desktop", "mobile"]) {
      const ctx = await browser.newContext(
        viewport === "mobile"
          ? { ...MOBILE, viewport: MOBILE.viewport, isMobile: true, hasTouch: true }
          : { viewport: DESKTOP },
      );
      const page = await newPageWithAnalytics(ctx);
      try {
        if (professionalId) {
          await runCase2Existing(
            page,
            job,
            viewport,
            { email: proEmail, password: proPassword },
            professionalId,
          );
        } else {
          record({
            step: "Case 2 existing user",
            case: "Case 2",
            viewport,
            expected: "Professional profile exists",
            actual: "No professional_profiles row for test user",
            pass: false,
            events: [],
            ux: [],
            risks: ["Profile incomplete blocks apply"],
            severity: "P0",
          });
        }
      } catch (e) {
        record({
          step: "Case 2 existing user",
          case: "Case 2",
          viewport,
          expected: "Logged-in apply flow",
          actual: String(e),
          pass: false,
          events: [],
          ux: [],
          risks: [],
          severity: "P0",
        });
      }
      allEvents.push(...(await getEvents(page)));
      await ctx.close();
    }
  } else {
    record({
      step: "Case 2 existing user login",
      case: "Case 2",
      viewport: "all",
      expected: "Login with test professional account",
      actual: "Could not sign in — set E2E_PRO_EMAIL / E2E_PRO_PASSWORD",
      pass: false,
      events: [],
      ux: [],
      risks: ["Existing-user path not validated"],
      severity: "P1",
    });
  }

  await browser.close();

  const dbEvents = await queryRecentProductEvents();
  const founderChecks = await verifyFounderEvents(dbEvents.map((e) => e.event_name));

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  const bugs = results
    .filter((r) => !r.pass && r.severity)
    .map((r) => ({
      step: r.step,
      case: r.case,
      severity: r.severity,
      actual: r.actual,
      risks: r.risks,
    }));

  const report = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    job: { id: job.id, slug: job.slug, title: job.title },
    summary: { passed, failed, total: results.length },
    founderDashboard: {
      dbEventsLast30min: dbEvents.length,
      eventChecks: founderChecks,
      note: "Founder metrics read from product_events table (anon RLS may limit rows)",
    },
    results,
    bugs,
    screenshotsDir: path.join(OUT, "screenshots"),
  };

  ensureReportsDir(OUT);
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, "CHECKLIST.md"), buildChecklistMarkdown(report));

  const { indexPath, linkPath } = publishLatestReport(OUT, "apply-flow-review", {
    capturedAt: report.capturedAt,
    score: `${report.summary.passed}/${report.summary.total} passed`,
    base: report.base,
    summary: `Apply flow E2E — job **${report.job.title}** (\`${report.job.slug}\`).`,
  });

  console.log(`\n=== Summary: ${passed}/${results.length} passed, ${failed} failed ===`);
  console.log(`Latest index: ${indexPath}`);
  console.log(`Open latest:  ${linkPath}/`);
  console.log(`This run:     ${OUT}/`);
}

function buildChecklistMarkdown(report) {
  const lines = [
    "# Apply Flow E2E Checklist",
    "",
    `**Run:** ${report.capturedAt}  `,
    `**Base:** ${report.base}  `,
    `**Job:** ${report.job.title} (\`${report.job.slug}\`)  `,
    `**Score:** ${report.summary.passed}/${report.summary.total} passed`,
    "",
    "## A. Pass/Fail Checklist",
    "",
    "| Case | Viewport | Step | Pass | Analytics |",
    "|------|----------|------|------|-----------|",
  ];

  for (const r of report.results) {
    const ev = (r.events || []).slice(0, 4).join(", ") || "—";
    lines.push(`| ${r.case} | ${r.viewport} | ${r.step} | ${r.pass ? "✅" : "❌"} | ${ev} |`);
  }

  lines.push("", "## B. Screenshots", "", `See \`${report.screenshotsDir}/\``, "");
  lines.push("## C. Bugs Found", "");
  if (!report.bugs.length) lines.push("_None with severity tag_", "");
  else {
    for (const b of report.bugs) {
      lines.push(`- **${b.severity}** — ${b.case} / ${b.step}: ${b.actual}`);
    }
  }

  lines.push("", "## D. Recommended Fixes", "");
  const fixes = new Set();
  for (const r of report.results.filter((x) => !x.pass)) {
    if (r.step.includes("Google")) fixes.add("Manually verify Google OAuth return path with `?apply=resume` on staging before merge.");
    if (r.risks?.some((x) => x.includes("context lost"))) fixes.add("P0: Fix apply intent persistence before any release.");
    if (r.actual?.includes("email confirmation")) fixes.add("P1: Enable instant signup session or clearer post-signup CTA when email confirm required.");
  }
  if (!fixes.size) lines.push("_Address failures in section C first._");
  else [...fixes].forEach((f) => lines.push(`- ${f}`));

  lines.push("", "## E. Severity Summary", "");
  const p0 = report.bugs.filter((b) => b.severity === "P0").length;
  const p1 = report.bugs.filter((b) => b.severity === "P1").length;
  lines.push(`- P0: ${p0}`, `- P1: ${p1}`);

  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
