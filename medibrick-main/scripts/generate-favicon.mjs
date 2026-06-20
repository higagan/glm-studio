import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "public/favicon.png");
const icon = path.join(root, "public/brand/logo-icon-transparent.png");

const b64 = fs.readFileSync(icon).toString("base64");

const html = `<!DOCTYPE html>
<html><head><style>*{margin:0;padding:0}body{width:512px;height:512px;background:#F5F8FC;display:flex;align-items:center;justify-content:center}</style></head>
<body><img src="data:image/png;base64,${b64}" style="width:360px;height:360px;object-fit:contain" /></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.setContent(html);
await page.screenshot({ path: out, omitBackground: false });
await browser.close();
console.log("wrote", out);
