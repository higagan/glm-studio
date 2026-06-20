import { readFileSync } from "fs";
import { join } from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  fetchHospitalProfileBySlug,
} from "./_lib/hospital-data.js";
import { buildHospitalSEO } from "../src/lib/hospital-seo.js";

let cachedIndexHtml: string | null = null;

function getIndexHtml(): string {
  if (!cachedIndexHtml) {
    cachedIndexHtml = readFileSync(join(process.cwd(), "dist/index.html"), "utf8");
  }
  return cachedIndexHtml;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const DEFAULT_OG_IMAGE = "https://medibrick.com/favicon.png";

interface HeadMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  jsonLd?: object | object[];
}

function buildHeadTags({ title, description, canonical, ogImage, jsonLd }: HeadMeta): string {
  const image = ogImage || DEFAULT_OG_IMAGE;
  const jsonLdBlocks = jsonLd
    ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
        .map((b) => `  <script type="application/ld+json">${JSON.stringify(b)}</script>`)
        .join("\n")
    : "";

  return `  <title>${escapeAttr(title)}</title>
  <meta name="description" content="${escapeAttr(description)}" />
  <link rel="canonical" href="${escapeAttr(canonical)}" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:url" content="${escapeAttr(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${escapeAttr(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${escapeAttr(image)}" />
${jsonLdBlocks}`;
}

function injectHead(html: string, meta: HeadMeta): string {
  const newTags = buildHeadTags(meta);
  return html.replace(
    /(<head[^>]*>)([\s\S]*?)(<\/head>)/i,
    (_, openTag, body: string, closeTag) => {
      const cleaned = body
        .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
        .replace(/<meta\s[^>]*name=["']description["'][^>]*\/?>/gi, "")
        .replace(/<link\s[^>]*rel=["']canonical["'][^>]*\/?>/gi, "")
        .replace(/<meta\s[^>]*property=["']og:[^"']*["'][^>]*\/?>/gi, "")
        .replace(/<meta\s[^>]*name=["']twitter:[^"']*["'][^>]*\/?>/gi, "")
        .replace(/<script\s[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
      return `${openTag}\n${newTags}\n${cleaned}${closeTag}`;
    }
  );
}

function normalizePath(url: string): string {
  const pathname = new URL(url, "https://medibrick.com").pathname;
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = normalizePath(req.url || "/hospitals");

  try {
    const match = path.match(/^\/hospitals\/([^/]+)\/?$/);
    if (!match) {
      res.status(404).send("Not found");
      return;
    }

    const slug = decodeURIComponent(match[1]);
    const payload = await fetchHospitalProfileBySlug(slug);

    if (!payload) {
      res.status(404).send("Hospital not found");
      return;
    }

    const { profile: hospital, openJobs: jobs, reviews, stats } = payload;
    const seo = buildHospitalSEO(hospital, { ...stats, openJobs: jobs.length }, reviews);
    const meta: HeadMeta = {
      title: seo.title,
      description: seo.description,
      canonical: `https://medibrick.com${seo.path}`,
      ogImage: seo.ogImage,
      jsonLd: seo.jsonLd,
    };

    const html = injectHead(getIndexHtml(), meta);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(html);
  } catch (err) {
    console.error("[render-hospital] error:", err);
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(getIndexHtml());
    } catch {
      res.status(500).send("Server error");
    }
  }
}
