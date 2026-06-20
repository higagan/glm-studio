import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SITE_URL, ALL_LANDING_SLUGS } from "../src/lib/job-constants.js";
import {
  fetchBlogSlugs,
  fetchOpenJobs,
} from "./_lib/jobs-data.js";
import { fetchHospitalSlugs } from "./_lib/hospital-data.js";

function urlEntry(loc: string, changefreq: string, priority: string): string {
  return `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const [jobs, blogSlugs, hospitalSlugs] = await Promise.all([
      fetchOpenJobs(),
      fetchBlogSlugs(),
      fetchHospitalSlugs(),
    ]);

    const staticPages = [
      { path: "/", changefreq: "weekly", priority: "1.0" },
      { path: "/for-hospitals", changefreq: "monthly", priority: "0.9" },
      { path: "/for-professionals", changefreq: "monthly", priority: "0.9" },
      { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
      { path: "/verification-process", changefreq: "monthly", priority: "0.8" },
      { path: "/jobs", changefreq: "daily", priority: "0.9" },
      { path: "/blog", changefreq: "weekly", priority: "0.7" },
    ];

    const entries: string[] = staticPages.map((p) =>
      urlEntry(`${SITE_URL}${p.path}`, p.changefreq, p.priority)
    );

    for (const slug of ALL_LANDING_SLUGS) {
      entries.push(urlEntry(`${SITE_URL}/jobs/${slug}`, "daily", "0.85"));
    }

    for (const job of jobs) {
      if (job.slug) {
        entries.push(urlEntry(`${SITE_URL}/jobs/${job.slug}`, "daily", "0.8"));
      }
    }

    for (const slug of hospitalSlugs) {
      entries.push(urlEntry(`${SITE_URL}/hospitals/${slug}`, "weekly", "0.75"));
    }

    for (const slug of blogSlugs) {
      entries.push(urlEntry(`${SITE_URL}/blog/${slug}`, "weekly", "0.6"));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    res.status(200).send(xml);
  } catch (error) {
    console.error("Sitemap error:", error);
    res.status(500).send("Server error");
  }
}
