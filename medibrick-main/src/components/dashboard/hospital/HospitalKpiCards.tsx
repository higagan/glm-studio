import type { ComponentType } from "react";
import { Briefcase, CheckCircle2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCard = {
  label: string;
  value: number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  iconBg: string;
  valueClass: string;
};

export function HospitalKpiCards({
  totalShifts,
  openShifts,
  filledShifts,
  totalApplicants,
}: {
  totalShifts: number;
  openShifts: number;
  filledShifts: number;
  totalApplicants: number;
}) {
  const cards: KpiCard[] = [
    {
      label: "Total Shifts",
      value: totalShifts,
      hint: "All time posted",
      icon: Briefcase,
      accent: "from-primary/5 to-transparent",
      iconBg: "bg-primary/10 text-primary",
      valueClass: "text-foreground",
    },
    {
      label: "Open Shifts",
      value: openShifts,
      hint: "Actively seeking staff",
      icon: Clock,
      accent: "from-amber-500/8 to-transparent",
      iconBg: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      valueClass: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Filled Shifts",
      value: filledShifts,
      hint: "Successfully covered",
      icon: CheckCircle2,
      accent: "from-emerald-500/8 to-transparent",
      iconBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      valueClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Applicants",
      value: totalApplicants,
      hint: "Across all shifts",
      icon: Users,
      accent: "from-violet-500/8 to-transparent",
      iconBg: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
      valueClass: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/60 bg-card",
              "shadow-sm hover:shadow-md transition-shadow duration-200",
              "bg-gradient-to-br",
              card.accent
            )}
          >
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-[2rem] font-bold leading-none tabular-nums tracking-tight",
                      card.valueClass
                    )}
                  >
                    {card.value}
                  </p>
                  <p className="mt-2.5 text-xs text-muted-foreground leading-snug">{card.hint}</p>
                </div>
                <div className={cn("rounded-xl p-2.5 flex-shrink-0", card.iconBg)}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
