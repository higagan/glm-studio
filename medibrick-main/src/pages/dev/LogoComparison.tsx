import { ArrowRight } from "lucide-react";
import MediBricksLogo from "@/components/MediBricksLogo";
import KeystoneMark from "@/components/brand/KeystoneMark";

const NAV_LINKS = [
  "For Hospitals",
  "For Professionals",
  "How it Works",
  "Verification",
  "Browse Jobs",
];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80";

const TRUST = ["Verified credentials", "License checks", "Two-way ratings", "Secure platform"];

function NavMock({
  variant,
}: {
  variant: "founder" | "keystone";
}) {
  const isFounder = variant === "founder";

  return (
    <header
      className={
        isFounder
          ? "border-b border-blue-100 bg-white"
          : "border-b border-border bg-card"
      }
    >
      <div className="px-4 h-14 flex items-center justify-between gap-3">
        {isFounder ? (
          <MediBricksLogo size="sm" />
        ) : (
          <div className="flex items-center gap-2">
            <KeystoneMark size={28} />
            <span className="font-heading font-semibold text-base text-foreground tracking-tight">
              MediBrick
            </span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
          {NAV_LINKS.slice(0, 3).map((l) => (
            <span
              key={l}
              className={isFounder ? "text-slate-600 hover:text-blue-700" : ""}
            >
              {l}
            </span>
          ))}
        </div>

        <button
          type="button"
          className={
            isFounder
              ? "text-xs font-semibold text-white px-3 py-1.5 rounded-lg shrink-0"
              : "text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-[10px] shrink-0"
          }
          style={isFounder ? { backgroundColor: "#E63946" } : undefined}
        >
          Post a shift
        </button>
      </div>
    </header>
  );
}

function HeroMock({ variant }: { variant: "founder" | "keystone" }) {
  const isFounder = variant === "founder";

  return (
    <section
      className={
        isFounder
          ? "border-b border-blue-100"
          : "border-b border-border"
      }
      style={
        isFounder
          ? {
              background:
                "linear-gradient(135deg, rgba(29,78,216,0.06) 0%, rgba(255,255,255,1) 45%, rgba(230,57,70,0.05) 100%)",
            }
          : undefined
      }
    >
      <div className="px-4 py-8 space-y-5">
        <div className="space-y-4">
          <p
            className={
              isFounder
                ? "text-[10px] font-semibold uppercase tracking-widest"
                : "text-[10px] font-mono-data font-medium uppercase tracking-widest text-muted-foreground"
            }
            style={isFounder ? { color: "#1D4ED8" } : undefined}
          >
            {isFounder ? "Healthcare staffing marketplace" : "Staffing infrastructure"}
          </p>

          <h2
            className={
              isFounder
                ? "font-bold text-2xl leading-tight"
                : "font-heading font-extrabold text-2xl text-foreground leading-tight"
            }
            style={isFounder ? { color: "#1E3A5F" } : undefined}
          >
            {isFounder ? (
              <>
                Staff every shift.{" "}
                <span style={{ color: "#E63946" }}>Trusted</span> in hours.
              </>
            ) : (
              <>
                Staff every shift. <span className="text-primary">Trusted</span> in hours.
              </>
            )}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            MediBrick connects hospitals with verified doctors, nurses, AYUSH practitioners
            and technicians — credential-checked, two-way rated, ready to cover the shift.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={
                isFounder
                  ? "text-sm font-semibold text-white px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
                  : "text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-[10px] inline-flex items-center gap-1.5"
              }
              style={isFounder ? { backgroundColor: "#E63946" } : undefined}
            >
              Find shifts
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={
                isFounder
                  ? "text-sm font-semibold px-4 py-2 rounded-lg border"
                  : "text-sm font-semibold px-4 py-2 rounded-[10px] border border-border bg-background"
              }
              style={
                isFounder
                  ? { color: "#1D4ED8", borderColor: "rgba(29,78,216,0.35)" }
                  : undefined
              }
            >
              For hospitals
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {TRUST.map((item, i) => (
              <span key={item}>
                {i > 0 && <span className="mx-1.5 opacity-40">·</span>}
                {item}
              </span>
            ))}
          </p>
        </div>

        <div className="relative">
          <div
            className={
              isFounder
                ? "relative aspect-[4/3] rounded-xl overflow-hidden border border-blue-100"
                : "relative aspect-[4/3] rounded-[14px] overflow-hidden border border-border bg-muted"
            }
          >
            <img
              src={HERO_IMAGE}
              alt=""
              className="h-full w-full object-cover saturate-[0.85]"
            />
            <div
              className={
                isFounder
                  ? "absolute inset-0 bg-gradient-to-t from-blue-900/25 via-transparent to-transparent"
                  : "absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent"
              }
            />
          </div>
          <div
            className={
              isFounder
                ? "absolute -bottom-3 right-3 w-44 rounded-xl border border-blue-100 bg-white p-3 shadow-md"
                : "absolute -bottom-3 right-3 w-44 rounded-[14px] border border-border bg-card p-3 shadow-md"
            }
          >
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Open shift
            </p>
            <p
              className="font-semibold text-sm"
              style={isFounder ? { color: "#1E3A5F" } : undefined}
            >
              ICU Duty Doctor
            </p>
            <div className="mt-1 flex justify-between text-xs">
              <span
                className={isFounder ? "font-semibold" : "font-mono-data text-primary font-medium"}
                style={isFounder ? { color: "#E63946" } : undefined}
              >
                ₹2,500/hr
              </span>
              <span className="text-muted-foreground">Indore · Tonight</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VariantCard({
  title,
  subtitle,
  variant,
  pros,
  cons,
  verdict,
}: {
  title: string;
  subtitle: string;
  variant: "founder" | "keystone";
  pros: string[];
  cons: string[];
  verdict: string;
}) {
  return (
    <article className="rounded-[14px] border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border bg-muted/40">
        <p className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground mb-1">
          {subtitle}
        </p>
        <h2 className="font-heading font-bold text-foreground text-lg">{title}</h2>
      </div>

      <NavMock variant={variant} />
      <HeroMock variant={variant} />

      <div className="px-5 py-5 space-y-4 text-sm border-t border-border">
        <div>
          <p className="font-medium text-foreground mb-2">Strengths</p>
          <ul className="space-y-1 text-muted-foreground">
            {pros.map((p) => (
              <li key={p}>+ {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground mb-2">Trade-offs</p>
          <ul className="space-y-1 text-muted-foreground">
            {cons.map((c) => (
              <li key={c}>− {c}</li>
            ))}
          </ul>
        </div>
        <p className="text-foreground/90 pt-1 border-t border-border">{verdict}</p>
      </div>
    </article>
  );
}

export default function LogoComparison() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-10 max-w-5xl">
          <p className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground mb-2">
            Brand direction
          </p>
          <h1 className="font-heading font-extrabold text-foreground text-2xl md:text-3xl mb-3">
            Logo & design system — side by side
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Same homepage copy and layout. Only the identity system changes — nav, color,
            typography weight, and hero atmosphere. Open at{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/dev/logo-comparison</code>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <VariantCard
            subtitle="Option A · live on main"
            title="Your heart logo — clinical marketplace"
            variant="founder"
            pros={[
              "Instantly reads as healthcare",
              "Memorable Medi / Brick name play",
              "Warm, human personality",
            ]}
            cons={[
              "Heart + ECG feels consumer-health, not B2B infra",
              "Red + navy + gold is busy at small sizes",
              "Yellow pulse line doesn’t scale to favicon/nav",
            ]}
            verdict="Best if MediBrick leads with “trusted healthcare jobs” — hospital buyers and doctors both get it in one glance."
          />
          <VariantCard
            subtitle="Option B · previous direction"
            title="Keystone — staffing infrastructure"
            variant="keystone"
            pros={[
              "Distinct from Practo / hospital portals",
              "Brick red used sparingly — premium restraint",
              "Scales cleanly: favicon, nav, dashboards",
            ]}
            cons={[
              "Less obviously “medical” at first glance",
              "More abstract — needs copy to carry meaning",
              "Your original artwork isn’t front and center",
            ]}
            verdict="Best if MediBrick sells to hospital ops teams as workforce infrastructure — serious, not sentimental."
          />
        </div>

        <section className="mt-12 rounded-[14px] border border-border bg-foreground text-background p-8 max-w-3xl">
          <h3 className="font-heading font-bold text-lg mb-3">You chose Option A</h3>
          <p className="text-background/75 text-sm leading-relaxed">
            Heart logo, red + navy + gold tokens, and clinical marketplace positioning are now
            live across the product. This page is kept for reference against the previous keystone
            direction.
          </p>
        </section>
      </div>
    </div>
  );
}
