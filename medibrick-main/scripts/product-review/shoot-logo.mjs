import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outArg = process.argv.find((a) => a.startsWith("--out="));
const out = outArg ? outArg.slice("--out=".length) : path.join(__dirname, "logo-preview.png");
const htmlUrl = pathToFileURL(path.join(__dirname, "logo-preview.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 980, height: 700 }, deviceScaleFactor: 2 });
await page.goto(htmlUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("shot", out);
