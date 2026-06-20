import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { navigateToPostShiftAuth } from "@/lib/post-shift-nav";

const BENEFITS = [
  { title: "Fill staffing gaps quickly", desc: "Post a shift and start receiving applications from verified professionals within hours." },
  { title: "Access verified professionals", desc: "Every doctor, nurse and technician has cleared credential and license checks." },
  { title: "Review candidate profiles", desc: "Compare experience, specialties, ratings and reviews before confirming." },
  { title: "Reduce hiring overhead", desc: "Skip agencies and long contracts — staff per-shift, per-day or per-week." },
  { title: "Flexible staffing", desc: "Cover leaves, surges and seasonal demand without committing to full-time hires." },
];

export default function ForHospitals() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="For Hospitals & Clinics — Post Shifts on MediBrick"
        description="Post healthcare shifts on MediBrick and access verified doctors, nurses, AYUSH practitioners and technicians across India. Fill staffing gaps fast, on your terms."
        path="/for-hospitals"
      />
      <Navigation />

      <section className="border-b border-border hero-marketplace">
        <div className="container mx-auto px-6 py-16 md:py-24 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-4">
            For hospitals & clinics
          </p>
          <h1 className="font-heading font-extrabold text-foreground leading-tight mb-5">
            Staff your facility with verified healthcare professionals.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
            MediBrick gives hospitals, clinics and diagnostic centres a faster, cleaner way to
            fill shifts — without agency overhead or hiring drag.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigateToPostShiftAuth(navigate)} className="group">
              Post a shift
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="mb-12 max-w-xl">
            <p className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground mb-3">
              Why MediBrick
            </p>
            <h2 className="font-heading font-bold text-foreground">
              Built for facilities that can&apos;t afford staffing gaps.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-[14px] border border-border bg-card p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-medium text-foreground mb-1 text-sm">{b.title}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Button size="lg" onClick={() => navigateToPostShiftAuth(navigate)}>
              Post a shift
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
