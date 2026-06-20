import { useState, useEffect, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Settings, CalendarDays } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import PostJobDialog, { type ShiftDuplicateSeed } from "./PostJobDialog";
import PostShiftSuccessDialog, { type PostedShiftSummary } from "./PostShiftSuccessDialog";
import { resolveJobRoleCategory } from "@/lib/healthcare-roles";
import { HospitalProfileMissingFields } from "./HospitalProfileMissingFields";
import {
  isHospitalProfileReadyForPosting,
} from "@/lib/hospital-profile-readiness";
import { clearPostShiftIntent } from "@/lib/auth-redirect";
import { HospitalDashboardShell } from "./hospital/HospitalDashboardShell";
import { HospitalKpiCards } from "./hospital/HospitalKpiCards";
import { HospitalShiftsTable, type HospitalShiftRow } from "./hospital/HospitalShiftsTable";

interface HospitalDashboardProps {
  user: User;
}

export default function HospitalDashboard({ user }: HospitalDashboardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const [jobs, setJobs] = useState<HospitalShiftRow[]>([]);
  const [applicantStats, setApplicantStats] = useState<
    Record<string, { total: number; pending: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [postedShift, setPostedShift] = useState<PostedShiftSummary | null>(null);
  const [duplicateSeed, setDuplicateSeed] = useState<ShiftDuplicateSeed | null>(null);
  const [hospitalProfile, setHospitalProfile] = useState<any>(null);

  const profileReady = isHospitalProfileReadyForPosting(hospitalProfile);

  useEffect(() => {
    void fetchHospitalProfile();
    void fetchJobs();
  }, [user, location.pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchHospitalProfile();
        void fetchJobs();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "post-shift") {
      tryOpenPostDialog();
    }
    if (action === "settings") {
      navigate("/dashboard/settings", { replace: true });
    }
  }, [searchParams]);

  // First-run nudge: a verified hospital with zero shifts has nothing to do here.
  // Open Post Shift once per session so their first action is the one that creates liquidity.
  useEffect(() => {
    if (loading || !profileReady || jobs.length > 0) return;
    if (showPostDialog || showSuccessDialog) return;
    const seenKey = `mb_firstrun_postshift_${user.id}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");
    setDuplicateSeed(null);
    setShowPostDialog(true);
  }, [loading, profileReady, jobs.length, showPostDialog, showSuccessDialog, user.id]);

  const fetchHospitalProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("hospital_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setHospitalProfile(data);
    } catch (error) {
      console.error("Error fetching hospital profile:", error);
    }
  };

  const fetchApplicantStats = async (jobIds: string[]) => {
    if (jobIds.length === 0) {
      setApplicantStats({});
      return;
    }

    const { data, error } = await supabase
      .from("applications")
      .select("job_id, status")
      .in("job_id", jobIds);

    if (error) {
      console.error("Error fetching applicant stats:", error);
      return;
    }

    const stats: Record<string, { total: number; pending: number }> = {};
    for (const row of data ?? []) {
      if (!stats[row.job_id]) stats[row.job_id] = { total: 0, pending: 0 };
      stats[row.job_id].total += 1;
      if (row.status === "pending") stats[row.job_id].pending += 1;
    }
    setApplicantStats(stats);
  };

  const fetchJobs = async () => {
    try {
      const { data: hospitalData } = await supabase
        .from("hospital_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!hospitalData) return;

      const { data, error } = await supabase
        .from("job_posts")
        .select(
          "id, slug, title, department, description, shift_date, shift_start_time, shift_end_time, compensation, status, created_at, required_specialization, specialty"
        )
        .eq("hospital_id", hospitalData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as HospitalShiftRow[];
      setJobs(rows);
      await fetchApplicantStats(rows.map((j) => j.id));
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobPosted = (posted: PostedShiftSummary) => {
    setShowPostDialog(false);
    setDuplicateSeed(null);
    setPostedShift(posted);
    setShowSuccessDialog(true);
    void fetchJobs();
  };

  const handleDuplicateShift = (job: HospitalShiftRow) => {
    setDuplicateSeed({
      title: job.title,
      roleCategory: resolveJobRoleCategory(job),
      department: job.department,
      specialty: job.specialty || "",
      description: job.description || "",
      shift_start_time: job.shift_start_time,
      shift_end_time: job.shift_end_time,
      compensation: String(job.compensation),
      preserveTitle: true,
    });
    setShowPostDialog(true);
  };

  const tryOpenPostDialog = () => {
    clearPostShiftIntent();
    setDuplicateSeed(null);
    setShowPostDialog(true);
  };

  const openJobs = jobs.filter((j) => j.status === "open").length;
  const filledJobs = jobs.filter((j) => j.status === "filled").length;
  const totalApplicants = useMemo(
    () => Object.values(applicantStats).reduce((sum, s) => sum + s.total, 0),
    [applicantStats]
  );
  const pendingApplicants = useMemo(
    () => Object.values(applicantStats).reduce((sum, s) => sum + s.pending, 0),
    [applicantStats]
  );

  const hospitalName = hospitalProfile?.hospital_name || "Hospital";
  const tableTab =
    tab === "candidates" || tab === "shifts" || tab === "drafts" || tab === "shortlisted"
      ? tab
      : "all";

  return (
    <HospitalDashboardShell
      hospitalName={hospitalName}
      onPostShift={tryOpenPostDialog}
      pendingApplicants={pendingApplicants}
    >
      <div className="max-w-6xl mx-auto space-y-7">
        {/* Welcome row */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-1">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Dashboard</p>
            <h1 className="text-2xl md:text-[1.75rem] font-bold text-foreground tracking-tight">
              Welcome back, {hospitalName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
              Manage shifts, track applicants, and fill coverage faster.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm shadow-sm w-fit">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">
              {format(new Date(), "EEEE, d MMM yyyy")}
            </span>
          </div>
        </div>

        {!profileReady && (
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-50/40 dark:from-amber-950/20 dark:to-transparent dark:border-amber-900/40 p-5 flex flex-col sm:flex-row sm:items-start gap-4">
            <Settings className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="font-medium text-foreground text-sm">
                  Pin your location when you post
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  You can post a shift now — we'll ask for your hospital address in the form.
                </p>
              </div>
              <HospitalProfileMissingFields profile={hospitalProfile} postingOnly />
            </div>
            <Button size="sm" onClick={tryOpenPostDialog} className="flex-shrink-0">
              Post a shift
            </Button>
          </div>
        )}

        <HospitalKpiCards
          totalShifts={jobs.length}
          openShifts={openJobs}
          filledShifts={filledJobs}
          totalApplicants={totalApplicants}
        />

        {tab === "candidates" && (
          <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Review applicants per shift below. Pending applications are marked as{" "}
            <span className="text-primary font-medium">new</span>.
          </div>
        )}

        <div id="hospital-shifts" className="scroll-mt-6">
          <HospitalShiftsTable
            jobs={jobs}
            applicantStats={applicantStats}
            loading={loading}
            initialTab={tableTab}
            onUpdate={fetchJobs}
            onPostShift={tryOpenPostDialog}
            onDuplicateShift={handleDuplicateShift}
          />
        </div>
      </div>

      <PostJobDialog
        open={showPostDialog}
        onOpenChange={(open) => {
          setShowPostDialog(open);
          if (!open) setDuplicateSeed(null);
        }}
        onSuccess={handleJobPosted}
        hospitalId={hospitalProfile?.id}
        duplicateFrom={duplicateSeed}
        onDuplicateConsumed={() => setDuplicateSeed(null)}
      />

      <PostShiftSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        shift={postedShift}
        onBackToDashboard={() => {
          setShowSuccessDialog(false);
          setPostedShift(null);
        }}
      />
    </HospitalDashboardShell>
  );
}
