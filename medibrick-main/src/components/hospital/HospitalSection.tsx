import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function HospitalSection({
  title,
  action,
  children,
  id,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={cn("px-4 lg:px-8 py-5 lg:py-7 border-b border-border", className)}>
      <div className="flex items-center justify-between gap-3 mb-3 lg:mb-4">
        <h2 className="text-xs lg:text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function HospitalStarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const iconClass = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(iconClass, i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25")}
        />
      ))}
    </div>
  );
}

export function HospitalStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
      <p className="text-lg lg:text-xl font-bold text-primary tabular-nums leading-none">{value}</p>
      <p className="text-[10px] lg:text-xs text-muted-foreground mt-1.5 font-medium leading-tight">{label}</p>
    </div>
  );
}
