import { track } from "@/lib/product-analytics";

export type ShareableShift = {
  slug: string;
  title: string;
  hospitalName?: string;
  city?: string;
};

export function buildJobPublicUrl(slug: string, via?: string): string {
  const base = `${typeof window !== "undefined" ? window.location.origin : "https://medibrick.com"}/jobs/${slug}`;
  return via ? `${base}?via=${via}` : base;
}

export function buildJobShareText(job: ShareableShift): string {
  const hospitalName = job.hospitalName || "Hospital";
  const city = job.city || "India";
  return `${job.title} at ${hospitalName}, ${city} — apply on MediBricks`;
}

export function shareJobOnWhatsApp(job: ShareableShift): void {
  const shareText = buildJobShareText(job);
  const url = buildJobPublicUrl(job.slug, "whatsapp");
  track("job_shared", { channel: "whatsapp", jobSlug: job.slug, jobTitle: job.title });
  const text = encodeURIComponent(`${shareText}\n${url}`);
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}
