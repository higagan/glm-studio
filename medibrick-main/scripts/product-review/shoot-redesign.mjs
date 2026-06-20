import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const OUT = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] || "/tmp/medibrick-redesign";
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  { name: "01-home", path: "/" },
  { name: "02-jobs", path: "/jobs" },
  { name: "03-for-hospitals", path: "/for-hospitals" },
  { name: "04-auth", path: "/auth" },
];

const viewports = [
  { tag: "desktop", width: 1440, height: 1024 },
  { tag: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch();
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  for (const p of pages) {
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(1200);
      const file = path.join(OUT, `${p.name}-${vp.tag}.png`);
      await page.screenshot({ path: file, fullPage: vp.tag === "desktop" });
      console.log("shot", file);
    } catch (e) {
      console.error("skip", p.path, vp.tag, e.message);
    }
  }
  await ctx.close();
}
await browser.close();
console.log("done →", OUT);
