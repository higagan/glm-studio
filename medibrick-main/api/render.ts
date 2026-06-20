import { readFileSync } from "fs";
import { join } from "path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  fetchJobBySlug,
  fetchJobsForLanding,
  fetchOpenJobs,
  parseJobsPath,
} from "./_lib/jobs-data.js";
import { buildJobDetailSEO, buildJobsListSEO } from "../src/lib/job-seo.js";
import {
  getLandingMeta,
  isLandingSlug,
} from "../src/lib/job-constants.js";

// Cached at warm function instance level
let cachedIndexHtml: string | null = null;

function getIndexHtml(): string {
  if (!cachedIndexHtml) {
    cachedIndexHtml = readFileSync(
      join(process.cwd(), "dist/index.html"),
      "utf8"
    );
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

/**
 * Replace the entire <head> block contents with job-specific tags,
 * preserving <script> and <link> asset tags from the Vite build.
 */
function injectHead(html: string, meta: HeadMeta): string {
  const newTags = buildHeadTags(meta);

  // Strip existing title, meta description, canonical, og:*, twitter:* and
  // any ld+json blocks, then prepend our tags just after <head>.
  return html.replace(
    /(<head[^>]*>)([\s\S]*?)(<\/head>)/i,
    (_, openTag, body: string, closeTag) => {
      // Remove tags we are replacing
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
  const path = normalizePath(req.url || "/jobs");

  try {
    const indexHtml = getIndexHtml();
    let meta: HeadMeta;

    const parsed = parseJobsPath(path);

    if (parsed.type === "detail" && parsed.slug) {
      const job = await fetchJobBySlug(parsed.slug);
      if (!job) {
        res.status(404).send("Job not found");
        return;
      }
      const seo = buildJobDetailSEO(job);
      meta = {
        title: seo.title,
        description: seo.description,
        canonical: `https://medibrick.com${seo.path}`,
        ogImage: seo.ogImage,
        jsonLd: seo.jsonLd,
      };
    } else if (parsed.type === "landing" && parsed.landingSlug) {
      const jobs = await fetchJobsForLanding(parsed.landingSlug);
      const pageMeta = getLandingMeta(parsed.landingSlug);
      const seo = buildJobsListSEO(jobs.length, pageMeta.heading);
      meta = {
        title: pageMeta.title,
        description: pageMeta.description,
        canonical: `https://medibrick.com/jobs/${parsed.landingSlug}`,
        jsonLd: seo.jsonLd,
      };
    } else {
      const jobs = await fetchOpenJobs();
      const seo = buildJobsListSEO(jobs.length);
      meta = {
        title: seo.title,
        description: seo.description,
        canonical: "https://medibrick.com/jobs",
        jsonLd: seo.jsonLd,
      };
    }

    const html = injectHead(indexHtml, meta);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(html);
  } catch (err) {
    console.error("[render] error:", err);
    // Fail open: serve unmodified index.html so the React app still loads
    try {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(getIndexHtml());
    } catch {
      res.status(500).send("Server error");
    }
  }
}
