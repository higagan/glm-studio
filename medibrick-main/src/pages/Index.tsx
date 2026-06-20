import { Button } from "@/components/ui/button";
import {
  Building2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import MediBricksLogo from "@/components/MediBricksLogo";
import SEO from "@/components/SEO";
import { navigateToPostShiftAuth } from "@/lib/post-shift-nav";

const TRUST_INLINE = [
  "Verified credentials",
  "License checks",
  "Two-way ratings",
  "Secure platform",
];

const HOSPITAL_STEPS = [
  { n: "01", title: "Post shift", desc: "Date, role, department, rate." },
  { n: "02", title: "Receive applications", desc: "Verified professionals apply." },
  { n: "03", title: "Review profiles", desc: "Credentials, ratings, experience." },
  { n: "04", title: "Select professional", desc: "Confirm the right fit." },
  { n: "05", title: "Complete assignment", desc: "Shift fulfilled, rated." },
];

const PROFESSIONAL_STEPS = [
  { n: "01", title: "Browse opportunities", desc: "Filter shifts nearby." },
  { n: "02", title: "Apply", desc: "One tap with your verified profile." },
  { n: "03", title: "Get selected", desc: "Hospital confirms you." },
  { n: "04", title: "Complete shift", desc: "Show up. Get paid." },
  { n: "05", title: "Build reputation", desc: "Collect verified ratings." },
];

const CATEGORIES = [
  { code: "DR", label: "Doctors" },
  { code: "NR", label: "Nurses" },
  { code: "AY", label: "AYUSH" },
  { code: "TC", label: "Technicians" },
  { code: "AH", label: "Allied health" },
];

const VERIFICATION = [
  {
    title: "Credential verification",
    desc: "Degrees, qualifications and IDs checked before profiles go live.",
  },
  {
    title: "License validation",
    desc: "NMC, state council and specialty licenses validated for currency.",
  },
  {
    title: "Two-way ratings",
    desc: "Hospitals and professionals rate each other after every shift.",
  },
];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="MediBrick — Healthcare Staffing Marketplace for India"
        description="MediBrick connects hospitals and clinics with verified doctors, nurses, AYUSH practitioners and technicians — credential-checked, rated, ready to cover the shift."
        path="/"
      />
      <Navigation />

      {/* HERO */}
      <section className="border-b border-border hero-marketplace">
        <div className="container mx-auto px-6 py-16 md:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            <div className="space-y-8 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Healthcare staffing marketplace
              </p>

              <h1 className="font-heading font-extrabold text-foreground max-w-xl">
                Staff every shift.{" "}
                <span className="text-primary">Trusted</span> in hours.
              </h1>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                MediBrick connects hospitals with verified doctors, nurses, AYUSH practitioners
                and technicians — credential-checked, two-way rated, ready to cover the shift.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => navigate("/jobs")} className="group">
                  Find shifts
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/for-hospitals")}
                >
                  For hospitals
                </Button>
              </div>

              <p className="text-sm text-muted-foreground pt-2">
                {TRUST_INLINE.map((item, i) => (
                  <span key={item}>
                    {i > 0 && <span className="mx-2 text-border">·</span>}
                    {item}
                  </span>
                ))}
              </p>
            </div>

            {/* Hero visual — warm photo + floating shift card */}
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-[14px] overflow-hidden border border-border bg-muted">
                <img
                  src={HERO_IMAGE}
                  alt="Healthcare facility corridor"
                  className="h-full w-full object-cover saturate-[0.85] contrast-[1.02]"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/25 via-transparent to-transparent" />
              </div>

              <div className="absolute -bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-72 rounded-[14px] border border-border bg-card p-4 shadow-md">
                <p className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground mb-1">
                  Open shift
                </p>
                <p className="font-heading font-semibold text-foreground text-sm">
                  ICU Duty Doctor
                </p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-mono-data text-primary font-medium">₹2,500/hr</span>
                  <span className="text-muted-foreground text-xs">Indore · Tonight</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground mb-3">
              How it works
            </p>
            <h2 className="font-heading font-bold text-foreground mb-3">
              Two workflows. One marketplace.
            </h2>
            <p className="text-muted-foreground">
              Hospitals post shifts. Professionals apply. Verification and ratings keep both sides honest.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[14px] border border-border bg-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <Building2 className="h-5 w-5 text-foreground" />
                <h3 className="font-heading font-semibold text-foreground">For hospitals</h3>
              </div>
              <ol className="space-y-5">
                {HOSPITAL_STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="font-mono-data text-xs text-muted-foreground pt-0.5 w-6 shrink-0">
                      {s.n}
                    </span>
                    <div>
                      <div className="font-medium text-foreground text-sm">{s.title}</div>
                      <div className="text-sm text-muted-foreground">{s.desc}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <Button className="mt-8 w-full" onClick={() => navigateToPostShiftAuth(navigate)}>
                Post a shift
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-[14px] border border-border surface-tint p-8">
              <p className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground mb-8">
                For professionals
              </p>
              <ol className="space-y-5">
                {PROFESSIONAL_STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="font-mono-data text-xs text-muted-foreground pt-0.5 w-6 shrink-0">
                      {s.n}
                    </span>
                    <div>
                      <div className="font-medium text-foreground text-sm">{s.title}</div>
                      <div className="text-sm text-muted-foreground">{s.desc}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <Button variant="outline" className="mt-8 w-full" onClick={() => navigate("/jobs")}>
                Find opportunities
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-8">
            <Link
              to="/how-it-works"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              See the full workflow →
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES — typographic, no medical icons */}
      <section className="py-20 border-y border-border surface-tint">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="mb-12 max-w-xl">
            <p className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground mb-3">
              Coverage
            </p>
            <h2 className="font-heading font-bold text-foreground">
              Multi-specialty healthcare talent
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {CATEGORIES.map((c) => (
              <div
                key={c.code}
                className="rounded-[14px] border border-border bg-card px-5 py-6 hover:border-foreground/15 transition-colors"
              >
                <span className="font-mono-data text-xs text-muted-foreground">{c.code}</span>
                <p className="mt-2 font-medium text-foreground text-sm">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR HOSPITALS */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground">
                For hospitals & clinics
              </p>
              <h2 className="font-heading font-bold text-foreground">
                Staff your facility — without the hiring drag.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Post a shift in minutes and reach pre-verified professionals across India.
              </p>
              <ul className="space-y-3">
                {[
                  "Fill staffing gaps quickly",
                  "Access verified professionals",
                  "Review profiles before confirming",
                  "Reduce hiring overhead",
                  "Flexible, on-demand staffing",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => navigateToPostShiftAuth(navigate)}>
                  Post a shift
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/for-hospitals">Learn more</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-10">
              <p className="font-heading font-semibold text-foreground text-xl mb-2">
                Pre-vetted talent. On your terms.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every professional on MediBrick goes through credential and license checks before
                their profile becomes visible to hospitals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOR PROFESSIONALS */}
      <section className="py-20 md:py-28 surface-tint border-y border-border">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 rounded-[14px] border border-border bg-card p-10">
              <p className="font-heading font-semibold text-foreground text-xl mb-2">
                Your schedule. Your reputation.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pick shifts that fit your week, get rated by hospitals you work with, and grow a
                profile that earns you better opportunities.
              </p>
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <p className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground">
                For healthcare professionals
              </p>
              <h2 className="font-heading font-bold text-foreground">
                Work where and when you want.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Discover flexible locum and per-diem shifts at verified healthcare facilities.
              </p>
              <ul className="space-y-3">
                {[
                  "Flexible work opportunities",
                  "Discover shifts nearby",
                  "Build a verified professional reputation",
                  "Manage your availability",
                  "Receive ratings and reviews",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => navigate("/jobs")}>
                  Browse jobs
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/for-professionals">Create profile</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VERIFICATION — dark editorial band */}
      <section className="py-20 md:py-28 bg-foreground text-background">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-2xl mb-14">
            <div className="h-px w-12 bg-accent mb-6" />
            <h2 className="font-heading font-bold text-background mb-4">
              Built on verification, not promises.
            </h2>
            <p className="text-background/70 leading-relaxed">
              Healthcare organizations need confidence in candidate quality. MediBrick builds
              that confidence into every profile on the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {VERIFICATION.map((c) => (
              <div key={c.title}>
                <h3 className="font-heading font-semibold text-background mb-2">{c.title}</h3>
                <p className="text-sm text-background/65 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <Link
            to="/verification-process"
            className="inline-block mt-12 text-sm font-medium text-background/80 hover:text-background transition-colors"
          >
            See how verification works →
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 md:py-28 border-t border-border">
        <div className="container mx-auto px-6 max-w-3xl text-center space-y-6">
          <h2 className="font-heading font-bold text-foreground">
            Join India's trusted healthcare staffing marketplace.
          </h2>
          <p className="text-muted-foreground">
            Whether you&apos;re staffing a facility or looking for your next shift — get started today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" onClick={() => navigateToPostShiftAuth(navigate)}>
              Post a shift
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/jobs")}>
              Find opportunities
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="space-y-4">
              <MediBricksLogo variant="default" size="md" showPulse />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Healthcare marketplace for Indian hospitals — connecting facilities with
                verified professionals.
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-4 text-sm">
                For professionals
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/for-professionals" className="hover:text-foreground">Why MediBrick</Link></li>
                <li><Link to="/jobs" className="hover:text-foreground">Browse jobs</Link></li>
                <li><Link to="/auth" className="hover:text-foreground">Create profile</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-4 text-sm">
                For facilities
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/for-hospitals" className="hover:text-foreground">Why MediBrick</Link></li>
                <li><Link to="/auth" className="hover:text-foreground">Post a shift</Link></li>
                <li><Link to="/verification-process" className="hover:text-foreground">Verification</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>
                <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 MediBrick. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
