import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Search } from "lucide-react";
import ApplicationsList from "@/components/dashboard/ApplicationsList";
import { cn } from "@/lib/utils";

export type HospitalShiftRow = {
  id: string;
  slug?: string;
  title: string;
  department: string;
  description?: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  compensation: number;
  status: string;
  created_at: string;
  required_specialization?: string;
  specialty?: string | null;
};

type StatusTab = "all" | "open" | "filled" | "drafts";

type ApplicantStats = {
  total: number;
  pending: number;
};

function statusBadge(status: string) {
  switch (status) {
    case "open":
      return <Badge variant="warning">Open</Badge>;
    case "filled":
      return <Badge variant="success">Filled</Badge>;
    case "closed":
      return <Badge variant="neutral">Closed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function HospitalShiftsTable({
  jobs,
  applicantStats,
  loading,
  initialTab = "all",
  onUpdate,
  onPostShift,
  onDuplicateShift,
}: {
  jobs: HospitalShiftRow[];
  applicantStats: Record<string, ApplicantStats>;
  loading: boolean;
  initialTab?: StatusTab | "candidates";
  onUpdate: () => void;
  onPostShift: () => void;
  onDuplicateShift: (job: HospitalShiftRow) => void;
}) {
  const [tab, setTab] = useState<StatusTab>(
    initialTab === "candidates" ? "all" : (initialTab as StatusTab) ?? "all"
  );
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [applicationsJob, setApplicationsJob] = useState<HospitalShiftRow | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.department).filter(Boolean))).sort(),
    [jobs]
  );

  const counts = useMemo(
    () => ({
      all: jobs.length,
      open: jobs.filter((j) => j.status === "open").length,
      filled: jobs.filter((j) => j.status === "filled").length,
      drafts: 0,
    }),
    [jobs]
  );

  const filtered = useMemo(() => {
    let list = [...jobs];

    if (tab === "open") list = list.filter((j) => j.status === "open");
    if (tab === "filled") list = list.filter((j) => j.status === "filled");
    if (tab === "drafts") list = [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q)
      );
    }

    if (department !== "all") {
      list = list.filter((j) => j.department === department);
    }

    if (statusFilter !== "all") {
      list = list.filter((j) => j.status === statusFilter);
    }

    list.sort((a, b) => new Date(a.shift_date).getTime() - new Date(b.shift_date).getTime());
    return list;
  }, [jobs, tab, search, department, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tabs: { id: StatusTab; label: string; count: number }[] = [
    { id: "all", label: "All Shifts", count: counts.all },
    { id: "open", label: "Open", count: counts.open },
    { id: "filled", label: "Filled", count: counts.filled },
    { id: "drafts", label: "Drafts", count: counts.drafts },
  ];

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-4 px-5 py-5 md:px-6 md:py-5 border-b border-border/50">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Shifts</h2>
          <Button variant="link" className="text-primary px-0 h-auto font-medium" onClick={() => setTab("all")}>
            View all shifts →
          </Button>
        </div>

        <div className="px-5 md:px-6 pb-6 space-y-4">
          <div className="flex flex-wrap gap-1 border-b border-border/50 pb-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setPage(1);
                }}
                className={cn(
                  "px-3.5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
                  tab === t.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {t.label}
                <span className="ml-1 text-muted-foreground">({t.count})</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search shifts by title, department..."
                className="pl-9 h-10 rounded-xl bg-muted/30 border-border/60"
              />
            </div>
            <Select value={department} onValueChange={(v) => { setDepartment(v); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-[180px] h-10 rounded-xl bg-muted/30 border-border/60">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-[150px] h-10 rounded-xl bg-muted/30 border-border/60">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Loading shifts...</p>
          ) : pageItems.length === 0 ? (
            <div className="text-center py-14 border border-dashed rounded-xl">
              <p className="font-medium text-foreground">No shifts found</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {tab === "drafts"
                  ? "Draft shifts are not available yet — post a shift to get started."
                  : "Post your first shift to start receiving applicants."}
              </p>
              <Button onClick={onPostShift}>Post a Shift</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/50">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide h-11">Shift Details</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide">Department</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Date & Time</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide">Rate</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Applicants</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((job) => {
                    const stats = applicantStats[job.id] ?? { total: 0, pending: 0 };
                    return (
                      <TableRow key={job.id} className="hover:bg-muted/20 border-border/40">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-foreground">{job.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {job.department}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{format(new Date(job.shift_date), "d MMM yyyy")}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.shift_start_time.slice(0, 5)} – {job.shift_end_time.slice(0, 5)}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-semibold">
                          ₹ {job.compensation.toLocaleString("en-IN")}/hr
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{stats.total} applicants</p>
                          {stats.pending > 0 && (
                            <p className="text-xs text-primary font-medium">{stats.pending} new</p>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(job.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg h-8 hidden sm:inline-flex"
                              onClick={() => onDuplicateShift(job)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Duplicate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg h-8"
                              onClick={() => setApplicationsJob(job)}
                            >
                              View
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 sm:hidden"
                              aria-label="Duplicate shift"
                              onClick={() => onDuplicateShift(job)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {pageItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === currentPage ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {applicationsJob && (
        <ApplicationsList
          open={!!applicationsJob}
          onOpenChange={(open) => !open && setApplicationsJob(null)}
          jobId={applicationsJob.id}
          jobTitle={applicationsJob.title}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
