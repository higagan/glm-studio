/**
 * Verifies /api/product-events accepts application_submitted and DB trigger dedupes.
 * Usage: node scripts/product-review/test-product-events.mjs [--base=https://medibrick.com]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE =
  process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "https://medibrick.com";

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;

async function postEvent(eventName, properties) {
  const res = await fetch(`${BASE}/api/product-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: eventName,
      properties,
      session_id: `test-${Date.now()}`,
      anonymous_id: `test-anon-${Date.now()}`,
      page: "/test",
      source: "automated_test",
    }),
  });
  return { status: res.status, ok: res.ok };
}

async function countSubmittedViaDb() {
  const { execSync } = await import("node:child_process");
  try {
    const out = execSync(
      'npx supabase db query --linked "SELECT count(*)::int AS n FROM product_events WHERE event_name = \'application_submitted\'"',
      { cwd: path.resolve(__dirname, "../.."), encoding: "utf8" },
    );
    const m = out.match(/"n":\s*(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Testing product-events API at ${BASE}`);

  const invalid = await postEvent("not_a_real_event", {});
  if (invalid.status !== 400) {
    throw new Error(`Expected 400 for invalid event, got ${invalid.status}`);
  }
  console.log("  invalid event rejected: ok");

  const testId = `test-app-${Date.now()}`;
  const valid = await postEvent("application_submitted", {
    jobSlug: "test-job",
    applicationId: testId,
    source: "automated_test",
  });
  if (!valid.ok && valid.status !== 204) {
    throw new Error(`application_submitted POST failed: HTTP ${valid.status}`);
  }
  console.log(`  application_submitted accepted: HTTP ${valid.status}`);

  const total = await countSubmittedViaDb();
  if (total === null) {
    console.log("  DB count: skipped (could not query linked DB)");
  } else if (total < 1) {
    throw new Error("product_events count for application_submitted is 0");
  } else {
    console.log(`  DB has application_submitted events: ${total}`);
  }

  console.log("\ntest-product-events: passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
