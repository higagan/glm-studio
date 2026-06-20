import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";

const STEPS = [
  { n: "01", title: "Credential verification", desc: "Degrees, qualifications and identity documents are checked before any professional profile becomes visible to hospitals." },
  { n: "02", title: "License validation", desc: "Medical, nursing, AYUSH and specialty council registrations are validated for currency and authenticity." },
  { n: "03", title: "Profile review", desc: "Every profile is reviewed for completeness, accuracy and appropriate scope of practice before going live." },
  { n: "04", title: "Ratings & reviews", desc: "Two-way ratings after every shift — hospitals rate professionals, professionals rate hospitals." },
  { n: "05", title: "Platform moderation", desc: "User reports are reviewed by the MediBrick team and bad actors are removed from the marketplace." },
  { n: "06", title: "Secure & compliant", desc: "Encrypted data, role-based access controls, and an India-first approach to healthcare data handling." },
];

export default function VerificationProcess() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Verification & Trust on MediBrick — Credential and License Checks"
        description="How MediBrick verifies every healthcare professional: credential verification, license validation, profile review, two-way ratings, platform moderation, and secure data handling."
        path="/verification-process"
      />
      <Navigation />

      <section className="border-b border-border hero-marketplace">
        <div className="container mx-auto px-6 py-16 md:py-24 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-4">
            Verification & trust
          </p>
          <h1 className="font-heading font-extrabold text-foreground leading-tight mb-5">
            Built on verification, not promises.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Hospitals need confidence in candidate quality and professionals need confidence in
            the facilities they work at. MediBrick builds that into every profile.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-[14px] border border-border bg-card p-6">
                <span className="font-mono-data text-xs text-muted-foreground">{s.n}</span>
                <h3 className="mt-2 font-medium text-foreground text-sm mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-foreground text-background border-t border-border">
        <div className="container mx-auto px-6 max-w-3xl text-center space-y-6">
          <h2 className="font-heading font-bold text-background">
            Trust is infrastructure, not marketing.
          </h2>
          <p className="text-background/70 leading-relaxed">
            Every shift on MediBrick runs on verified profiles, validated licenses, and
            two-way accountability after the work is done.
          </p>
          <Link
            to="/jobs"
            className="inline-block text-sm font-medium text-background/80 hover:text-background transition-colors"
          >
            Browse verified opportunities →
          </Link>
        </div>
      </section>
    </div>
  );
}
