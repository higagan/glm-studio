import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";

const BENEFITS = [
  { title: "Flexible work opportunities", desc: "Pick shifts that fit your schedule — locum, per-diem, weekends, nights." },
  { title: "Discover shifts nearby", desc: "Location-aware job discovery surfaces facilities close to you." },
  { title: "Build professional reputation", desc: "Verified ratings and reviews after every shift you complete." },
  { title: "Manage availability", desc: "Set when you're open to work and let opportunities come to you." },
  { title: "Ratings and reviews", desc: "Transparent two-way ratings keep the marketplace honest for everyone." },
];

export default function ForProfessionals() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="For Healthcare Professionals — Find Shifts on MediBrick"
        description="Find flexible, verified healthcare shifts on MediBrick. Doctors, nurses, AYUSH practitioners and technicians across India can browse, apply, and build their professional reputation."
        path="/for-professionals"
      />
      <Navigation />

      <section className="border-b border-border hero-marketplace">
        <div className="container mx-auto px-6 py-16 md:py-24 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-4">
            For healthcare professionals
          </p>
          <h1 className="font-heading font-extrabold text-foreground leading-tight mb-5">
            Flexible healthcare shifts at verified facilities.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
            Browse opportunities, apply in one tap, and build a reputation that opens doors —
            all on staffing infrastructure built for medical professionals.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate("/jobs")} className="group">
              Browse jobs
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">Create profile</Link>
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
              Your schedule. Your reputation. Verified facilities.
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
            <Button size="lg" onClick={() => navigate("/auth")}>
              Create profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
