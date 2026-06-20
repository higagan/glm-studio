import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Desktop Cursor reports folder (primary deliverable location). */
export const CURSOR_REPORTS_DIR = path.join(os.homedir(), "Desktop/cursor/reports");

const LATEST_INDEX_FILE = "00-LATEST.md";
const LATEST_LINK_NAME = "01-latest";

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Sortable run folder stamp: YYYY-MM-DD_HHmmss (newest name = newest run among dated folders). */
export function formatRunStamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-") + `_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

/**
 * Per-run output directory under Desktop/cursor/reports/.
 * Example: .../reports/2026-06-17_013045_apply-flow-review/
 */
export function resolveReportsDir(argv = process.argv, reviewType = "") {
  const flag = argv.find((a) => a.startsWith("--out="))?.split("=")[1];
  const base = flag ? path.resolve(flag) : CURSOR_REPORTS_DIR;
  if (!reviewType) return base;
  return path.join(base, `${formatRunStamp()}_${reviewType}`);
}

export function ensureReportsDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function removePath(target) {
  try {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || stat.isFile()) {
      fs.unlinkSync(target);
      return;
    }
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    /* absent */
  }
}

/**
 * Pin the newest run at the top of the reports folder:
 * - 00-LATEST.md  (index, sorts first by name)
 * - 01-latest/    (symlink to this run — open this for the current report)
 */
export function publishLatestReport(runDir, reviewType, meta = {}) {
  const root = path.dirname(runDir);
  ensureReportsDir(root);

  const folderName = path.basename(runDir);
  const capturedAt = meta.capturedAt || new Date().toISOString();
  const lines = [
    "# Latest MediBrick report",
    "",
    `**Updated:** ${capturedAt}`,
    `**Type:** ${reviewType}`,
    `**Folder:** [\`${folderName}/\`](./${folderName}/)`,
    "",
  ];

  if (meta.summary) lines.push(meta.summary, "");
  if (meta.score) lines.push(`**Score:** ${meta.score}`, "");
  if (meta.base) lines.push(`**Environment:** ${meta.base}`, "");
  if (meta.extra) lines.push(meta.extra, "");

  lines.push(
    "---",
    "",
    "Open **`01-latest/`** for the current report (symlink to the run above).",
    "Older runs stay in timestamped folders below.",
    "",
  );

  fs.writeFileSync(path.join(root, LATEST_INDEX_FILE), lines.join("\n"));

  const linkPath = path.join(root, LATEST_LINK_NAME);
  removePath(linkPath);
  fs.symlinkSync(folderName, linkPath, "dir");

  return { indexPath: path.join(root, LATEST_INDEX_FILE), linkPath, runDir };
}

/**
 * List run folders newest-first (for scripts or maintenance).
 */
export function listReportRuns(root = CURSOR_REPORTS_DIR) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d{6}_/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => b.localeCompare(a));
}
