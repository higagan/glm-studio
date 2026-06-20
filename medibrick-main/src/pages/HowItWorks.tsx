import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { navigateToPostShiftAuth } from "@/lib/post-shift-nav";

const HOSPITAL = [
  { n: "01", title: "Post shift", desc: "Date, role, department, rate — published in minutes." },
  { n: "02", title: "Receive applications", desc: "Verified professionals in your area apply." },
  { n: "03", title: "Review profiles", desc: "Compare credentials, experience and ratings." },
  { n: "04", title: "Select professional", desc: "Confirm the candidate that fits your need." },
  { n: "05", title: "Complete assignment", desc: "Shift fulfilled, then rate the professional." },
];

const PROFESSIONAL = [
  { n: "01", title: "Browse opportunities", desc: "Filter shifts by location, role and date." },
  { n: "02", title: "Apply", desc: "Send your verified profile with one tap." },
  { n: "03", title: "Get selected", desc: "Hospital confirms you for the shift." },
  { n: "04", title: "Complete shift", desc: "Show up, deliver care, get paid." },
  { n: "05", title: "Build reputation", desc: "Collect verified ratings that unlock better shifts." },
];

function Workflow({
  label,
  steps,
  cta,
  onCta,
  variant = "card",
}: {
  label: string;
  steps: typeof HOSPITAL;
  cta: string;
  onCta: () => void;
  variant?: "card" | "tint";
}) {
  return (
    <div
      className={`rounded-[14px] border border-border p-8 ${
        variant === "tint" ? "surface-tint" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-3 mb-8">
        {variant === "card" ? (
          <Building2 className="h-5 w-5 text-foreground" />
        ) : null}
        <h2 className="font-heading font-semibold text-foreground">{label}</h2>
      </div>
      <ol className="space-y-5">
        {steps.map((s) => (
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
      <Button
        className="mt-8 w-full"
        variant={variant === "tint" ? "outline" : "default"}
        onClick={onCta}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function HowItWorks() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="How MediBrick Works — Healthcare Staffing Marketplace"
        description="MediBrick is a two-sided marketplace. Hospitals post shifts. Verified professionals apply. Both sides rate each other after every assignment."
        path="/how-it-works"
      />
      <Navigation />

      <section className="border-b border-border hero-marketplace">
        <div className="container mx-auto px-6 py-16 md:py-24 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-4">
            How it works
          </p>
          <h1 className="font-heading font-extrabold text-foreground leading-tight mb-5">
            Two workflows. One marketplace.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Hospitals post shifts. Professionals apply. Verification and ratings keep both sides honest.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Workflow
            label="For hospitals"
            steps={HOSPITAL}
            cta="Post a shift"
            onCta={() => navigateToPostShiftAuth(navigate)}
          />
          <Workflow
            label="For professionals"
            steps={PROFESSIONAL}
            cta="Find opportunities"
            onCta={() => navigate("/jobs")}
            variant="tint"
          />
        </div>

        <div className="container mx-auto px-6 max-w-6xl mt-12 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => navigateToPostShiftAuth(navigate)} className="group">
            Post a shift
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/jobs")}>
            Browse jobs
          </Button>
        </div>
      </section>
    </div>
  );
}
