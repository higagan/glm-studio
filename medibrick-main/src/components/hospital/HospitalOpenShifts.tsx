import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { track } from "@/lib/product-analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HospitalSection } from "@/components/hospital/HospitalSection";
import type { HospitalPublicJob } from "@/lib/hospital-types";
import { ChevronRight, Stethoscope } from "lucide-react";

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function HospitalOpenShifts({
  jobs,
  hospitalSlug,
}: {
  jobs: HospitalPublicJob[];
  hospitalSlug: string;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const departments = useMemo(
    () => [...new Set(jobs.map((j) => j.department).filter(Boolean))],
    [jobs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (deptFilter !== "all" && job.department !== deptFilter) return false;
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q) ||
        job.required_specialization.toLowerCase().includes(q)
      );
    });
  }, [jobs, query, deptFilter]);

  const openJob = (job: HospitalPublicJob) => {
    track("hospital_apply_started", {
      hospitalSlug,
      jobSlug: job.slug || job.id,
    });
    navigate(`/jobs/${job.slug || job.id}`);
  };

  return (
    <HospitalSection
      id="open-shifts"
      title="Open shifts"
      action={
        jobs.length > 0 ? (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{filtered.length}</span>
        ) : undefined
      }
    >
      {jobs.length === 0 ? (
        <div className="text-center py-6">
          <Stethoscope className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">No shifts right now</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Follow this hospital to get notified.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/jobs")}>
            Browse all shifts
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Search shifts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10"
            />
            {departments.length > 1 && (
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="all">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {filtered.map((job) => {
              const shiftDate = new Date(job.shift_date + "T00:00:00");
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => openJob(job)}
                  className="w-full text-left px-4 py-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[15px] leading-snug">{job.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(shiftDate, "EEE, MMM d")} · {formatTime(job.shift_start_time)} –{" "}
                        {formatTime(job.shift_end_time)}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        {job.department} · {job.required_specialization}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {job.compensation != null && (
                        <span className="text-sm font-bold whitespace-nowrap">
                          ₹{Number(job.compensation).toLocaleString("en-IN")}/hr
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </HospitalSection>
  );
}
