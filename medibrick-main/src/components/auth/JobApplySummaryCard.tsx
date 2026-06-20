import { format } from "date-fns";
import { Building2, Calendar, IndianRupee } from "lucide-react";
import type { JobApplyContext } from "@/lib/job-apply-context";
import { cn } from "@/lib/utils";

export function JobApplySummaryCard({
  job,
  className,
}: {
  job: JobApplyContext;
  className?: string;
}) {
  let shiftLabel = job.shiftDate;
  try {
    shiftLabel = format(new Date(job.shiftDate), "EEE, MMM d, yyyy");
  } catch {
    /* keep raw */
  }

  const payLabel =
    job.compensation != null ? `₹${job.compensation.toLocaleString("en-IN")}/hour` : "—";

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 p-4 text-left shadow-sm",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-primary mb-2">
        Applying for
      </p>
      <h2 className="font-semibold text-foreground leading-snug">{job.title}</h2>
      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
          <span>{job.hospitalName}</span>
        </div>
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 shrink-0 text-primary/70" />
          <span>{payLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
          <span>{shiftLabel}</span>
        </div>
      </div>
    </div>
  );
}
