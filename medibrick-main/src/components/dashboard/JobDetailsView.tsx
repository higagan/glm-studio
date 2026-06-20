import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { saveJobApplyRedirect, consumePendingApply, shouldResumeApply, clearJobApplyContext } from "@/lib/auth-redirect";
import {
  canOpenApplyDialog,
  clearApplyOnboardingReady,
  markApplyOnboardingReady,
} from "@/lib/apply-readiness";
import { track } from "@/lib/product-analytics";
import { useTaskAuthFlow } from "@/hooks/useTaskAuthFlow";
import { TaskAuthSheet } from "@/components/auth/TaskAuthSheet";
import { MinimalOnboardingSheet } from "@/components/auth/MinimalOnboardingSheet";
import { fetchOnboardingStatus } from "@/lib/onboarding-status";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Loader2,
  Navigation,
} from "lucide-react";
import ShareJobButton from "@/components/ShareJobButton";
import { format } from "date-fns";
import { calculateDistance, formatDistance, extractLocality } from "@/lib/distance";
import { hospitalProfilePath } from "@/lib/hospital-types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface JobDetailsViewProps {
  job: any;
  professionalId?: string;
  onUpdate: () => void;
  showLoginPrompt?: boolean;
  isHospitalAccount?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

export default function JobDetailsView({
  job,
  professionalId,
  onUpdate,
  showLoginPrompt = false,
  isHospitalAccount = false,
  userLocation,
}: JobDetailsViewProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const referralSource = searchParams.get("via");
  const resumeApplyParam = searchParams.get("apply");
  const [loading, setLoading] = useState(false);

  // Analytics: fire job_viewed once per job change
  useEffect(() => {
    if (!job?.id) return;
    track("job_viewed", {
      jobSlug: job.slug || job.id,
      jobTitle: job.title,
      hospital: job.hospital_profiles?.hospital_name || "",
      city: job.hospital_profiles?.city || "",
      via: referralSource || "direct",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [hasApplied, setHasApplied] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(100);

  const openApplyDialog = useCallback(() => {
    track("application_dialog_opened", {
      jobSlug: job.slug || job.id,
      profileCompletion,
      source: "task_auth_flow",
    });
    track("application_started", {
      jobSlug: job.slug || job.id,
      profileCompletion,
      source: "task_auth_flow",
    });
    setShowApplyDialog(true);
  }, [job.id, job.slug, profileCompletion]);

  const taskAuth = useTaskAuthFlow();

  const finishApplyTask = useCallback(() => {
    markApplyOnboardingReady();
    onUpdate();
    window.setTimeout(() => openApplyDialog(), 400);
  }, [onUpdate, openApplyDialog]);

  const clearResumeParam = () => {
    if (resumeApplyParam !== "resume") return;
    const next = new URLSearchParams(searchParams);
    next.delete("apply");
    setSearchParams(next, { replace: true });
  };

  const tryResumeApplyFlow = async (completion: number, alreadyApplied: boolean) => {
    if (!professionalId || !job?.id || alreadyApplied) return;
    if (!shouldResumeApply(job.id, resumeApplyParam)) return;

    const consumed = consumePendingApply(job.id);
    if (resumeApplyParam === "resume" || consumed) {
      track("apply_resumed_after_auth", {
        jobSlug: job.slug || job.id,
        jobTitle: job.title,
        profileCompletion: completion,
        via: referralSource || "direct",
      });
    }

    if (!canOpenApplyDialog(completion, job.id, resumeApplyParam)) {
      saveJobApplyRedirect(job);
      taskAuth.startOnboardingOnly("apply", finishApplyTask, job);
      clearResumeParam();
      return;
    }

    track("application_dialog_opened", {
      jobSlug: job.slug || job.id,
      profileCompletion: completion,
      source: "auth_resume",
    });
    track("application_started", {
      jobSlug: job.slug || job.id,
      profileCompletion: completion,
      source: "auth_resume",
    });
    setShowApplyDialog(true);
    clearResumeParam();
  };

  // Check if user has already applied and profile completion
  useEffect(() => {
    const checkProfileAndApplication = async () => {
      if (professionalId && job.id) {
        const { data: appData } = await supabase
          .from("applications")
          .select("id")
          .eq("job_id", job.id)
          .eq("professional_id", professionalId)
          .maybeSingle();

        setHasApplied(!!appData);

        const { data: profData } = await supabase
          .from("professional_profiles")
          .select("*")
          .eq("id", professionalId)
          .single();

        if (profData) {
          const { data: userData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", profData.user_id)
            .single();

          const fields = [
            userData?.full_name,
            userData?.phone,
            profData?.specialization,
            profData?.experience_years,
            profData?.qualifications,
            profData?.bio,
          ];
          const filledFields = fields.filter(
            (field) => field && field.toString().trim() !== ""
          ).length;
          const completion = Math.round((filledFields / fields.length) * 100);
          setProfileCompletion(completion);

          await tryResumeApplyFlow(completion, !!appData);
        }
      }
    };

    checkProfileAndApplication();
  }, [professionalId, job.id, resumeApplyParam]);

  const handleApplyClick = async () => {
    if (isHospitalAccount) {
      navigate("/dashboard");
      return;
    }

    track("apply_clicked", {
      jobSlug: job.slug || job.id,
      jobTitle: job.title,
      loggedIn: !showLoginPrompt,
      profileComplete: canOpenApplyDialog(profileCompletion, job.id, resumeApplyParam),
      via: referralSource || "direct",
    });

    if (showLoginPrompt) {
      saveJobApplyRedirect(job);
      track("apply_requires_auth", {
        jobSlug: job.slug || job.id,
        jobTitle: job.title,
        via: referralSource || "direct",
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const status = await fetchOnboardingStatus(session.user.id);
        if (!status.isComplete) {
          taskAuth.startOnboardingOnly("apply", finishApplyTask, job);
          return;
        }
        onUpdate();
        openApplyDialog();
        return;
      }

      taskAuth.startApplyFlow(job, finishApplyTask);
    } else if (!canOpenApplyDialog(profileCompletion, job.id, resumeApplyParam)) {
      taskAuth.startOnboardingOnly("apply", finishApplyTask, job);
    } else {
      track("application_dialog_opened", {
        jobSlug: job.slug || job.id,
        profileCompletion,
      });
      track("application_started", {
        jobSlug: job.slug || job.id,
        profileCompletion,
      });
      openApplyDialog();
    }
  };

  const handleApply = async () => {
    if (!professionalId) return;
    setLoading(true);

    try {
      const { data: inserted, error } = await supabase
        .from("applications")
        .insert({
          job_id: job.id,
          professional_id: professionalId,
          cover_letter: coverLetter,
          ...(referralSource ? { referral_source: referralSource } : {}),
        })
        .select("id")
        .single();

      if (error) throw error;

      // application_submitted is recorded by DB trigger (trg_application_submitted_analytics)

      clearApplyOnboardingReady();
      clearJobApplyContext();

      toast({
        title: "Application submitted!",
        description: "The hospital will review your application.",
      });
      setShowApplyDialog(false);
      setCoverLetter("");
      setHasApplied(true);
      onUpdate();

      if (job.slug) {
        const target = `/jobs/${job.slug}${window.location.search}`;
        if (window.location.pathname !== `/jobs/${job.slug}`) {
          navigate(target, { replace: true });
        }
      }
    } catch (error: any) {
      const isDuplicate = error.message?.includes("duplicate") || error.code === "23505";
      toast({
        title: isDuplicate ? "Already applied" : "Error",
        description: isDuplicate
          ? "You've already applied to this shift."
          : error.message || "Failed to submit application",
        variant: "destructive",
      });
      if (isDuplicate) setHasApplied(true);
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance if user location is available
  const distance =
    userLocation &&
    job.hospital_profiles?.latitude &&
    job.hospital_profiles?.longitude
      ? calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          job.hospital_profiles.latitude,
          job.hospital_profiles.longitude
        )
      : null;

  // Determine location display text
  const getLocationDisplay = () => {
    if (distance !== null) {
      return formatDistance(distance);
    }
    if (job.hospital_profiles?.address) {
      return extractLocality(job.hospital_profiles.address);
    }
    return job.hospital_profiles?.city || "Location not set";
  };

  const showSpecialization =
    job.required_specialization &&
    job.required_specialization.toLowerCase() !== job.department.toLowerCase();

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a job to view details</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto bg-background">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 md:py-10 lg:px-12 lg:py-12 space-y-8 lg:space-y-10 pb-28 lg:pb-10">
          {/* Header Section with Apply Button */}
          <div className="flex items-start justify-between gap-6 lg:gap-8 pb-6 lg:pb-8 border-b border-border">
            <div className="flex-1">
              {/* Job Title */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-3 lg:mb-4">
                {job.title}
              </h1>

              {/* Facility */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {job.hospital_profiles ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        hospitalProfilePath({
                          slug: job.hospital_profiles?.slug,
                          id: job.hospital_profiles?.id || job.hospital_id || job.id,
                        })
                      )
                    }
                    className="text-lg lg:text-xl font-semibold text-primary hover:text-primary/80 transition-colors text-left underline-offset-2 hover:underline"
                  >
                    {job.hospital_profiles.hospital_name || "Hospital"}
                  </button>
                ) : (
                  <span className="text-lg lg:text-xl font-semibold text-foreground">Hospital</span>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm lg:text-base">
                <MapPin className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
                <span className={distance !== null ? "text-primary font-semibold" : "text-muted-foreground"}>
                  {getLocationDisplay()}
                </span>
                {job.hospital_profiles?.address && (
                  <span className="text-muted-foreground/50">•</span>
                )}
                {job.hospital_profiles?.address && (
                  <span className="text-muted-foreground">{job.hospital_profiles.address}</span>
                )}
              </div>
            </div>

            {/* Actions - Top Right */}
            <div className="flex-shrink-0 hidden lg:flex items-center gap-2 lg:gap-3">
              <ShareJobButton job={job} buttonSize="default" className="h-11 px-4 text-base" />
              {job.status === "open" && (
                <Button
                  onClick={handleApplyClick}
                  disabled={!isHospitalAccount && (loading || hasApplied)}
                  variant={isHospitalAccount ? "outline" : "default"}
                  className="font-semibold px-6 py-2.5 lg:px-8 lg:py-3 h-auto lg:h-12 min-w-[120px] lg:min-w-[140px] text-base"
                >
                  {!isHospitalAccount && loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : !isHospitalAccount && hasApplied ? (
                    "Applied"
                  ) : isHospitalAccount ? (
                    "Your dashboard"
                  ) : (
                    "Apply now"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Compensation - Clean Display */}
          <div className="pb-6 lg:pb-8 border-b border-border">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                ₹{job.compensation}
              </span>
              <span className="text-lg lg:text-xl text-muted-foreground">per hour</span>
            </div>
          </div>

          {/* Job Details - Clean List Format */}
          <div className="space-y-4 lg:space-y-5 pb-6 lg:pb-8 border-b border-border">
            <div className="flex items-start gap-4 lg:gap-6">
              <div className="w-24 lg:w-32 flex-shrink-0">
                <p className="text-sm lg:text-base text-muted-foreground">Shift Date</p>
              </div>
              <div className="flex-1">
                <p className="text-sm lg:text-base font-medium text-foreground">
                  {format(new Date(job.shift_date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 lg:gap-6">
              <div className="w-24 lg:w-32 flex-shrink-0">
                <p className="text-sm lg:text-base text-muted-foreground">Shift Time</p>
              </div>
              <div className="flex-1">
                <p className="text-sm lg:text-base font-medium text-foreground">
                  {job.shift_start_time.slice(0, 5)} - {job.shift_end_time.slice(0, 5)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 lg:gap-6">
              <div className="w-24 lg:w-32 flex-shrink-0">
                <p className="text-sm lg:text-base text-muted-foreground">Department</p>
              </div>
              <div className="flex-1">
                <p className="text-sm lg:text-base font-medium text-foreground">{job.department}</p>
              </div>
            </div>

            {showSpecialization && (
              <div className="flex items-start gap-4 lg:gap-6">
                <div className="w-24 lg:w-32 flex-shrink-0">
                  <p className="text-sm lg:text-base text-muted-foreground">Specialization</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm lg:text-base font-medium text-foreground">
                    {job.required_specialization}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Job Description */}
          {job.description &&
            job.description.length > 15 &&
            !job.description.match(/^[a-z\s]{1,10}$/i) && (
              <div className="space-y-3 pt-4">
                <h2 className="text-lg lg:text-xl font-semibold text-foreground mb-3">
                  Job Description
                </h2>
                <div className="prose prose-sm lg:prose-base max-w-none">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm lg:text-base">
                    {job.description}
                  </p>
                </div>
              </div>
            )}

          {/* Navigate CTA */}
          {job.hospital_profiles?.latitude && job.hospital_profiles?.longitude && (
            <div className="pb-4">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const url = `https://maps.google.com/?q=${job.hospital_profiles.latitude},${job.hospital_profiles.longitude}`;
                  track("maps_opened", {
                    jobSlug: job.slug || job.id,
                    hospital: job.hospital_profiles?.hospital_name || "",
                  });
                  window.open(url, "_blank");
                }}
              >
                <Navigation className="h-4 w-4" />
                Navigate to {job.hospital_profiles.hospital_name || "hospital"}
              </Button>
            </div>
          )}

          {/* What happens next (trust + clarity) */}
          {job.status === "open" && (
            <div className="pt-6 lg:pt-8 border-t border-border space-y-3 lg:space-y-4">
              <h2 className="text-base lg:text-lg font-semibold text-foreground">What happens next</h2>
              <ul className="text-sm lg:text-base text-muted-foreground space-y-1.5 lg:space-y-2">
                <li>1) You submit your application (optional note).</li>
                <li>2) The facility reviews and contacts you if selected.</li>
                <li>3) You confirm availability and final details.</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                We never share sensitive details publicly. Applications are submitted through our secure platform.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky mobile apply bar (thumb-friendly) */}
      {job.status === "open" && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {isHospitalAccount ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    Hospital account
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Post and manage shifts from your dashboard.
                  </div>
                </div>
                <Button onClick={() => navigate("/dashboard")} className="h-11 px-5 font-semibold">
                  Dashboard
                </Button>
              </div>
            ) : !showLoginPrompt &&
            !canOpenApplyDialog(profileCompletion, job.id, resumeApplyParam) ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    Complete your profile to apply
                  </div>
                  <div className="text-xs text-muted-foreground">
                    You need {70 - profileCompletion}% more to unlock applications.
                  </div>
                </div>
                <Button variant="outline" onClick={() => navigate("/profile")} className="h-11">
                  Complete
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    ₹{job.compensation}/hour
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {format(new Date(job.shift_date), "EEE, MMM d")} • {job.shift_start_time.slice(0, 5)} – {job.shift_end_time.slice(0, 5)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShareJobButton job={job} buttonSize="default" />
                  <Button
                    onClick={handleApplyClick}
                    disabled={loading || hasApplied}
                    className={cn("h-12 px-6 font-semibold", showLoginPrompt ? "" : "")}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : hasApplied ? (
                      "Applied"
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
            <DialogDescription>
              Quick apply — add an optional cover note for context.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {job.hospital_profiles?.hospital_name || "Hospital"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{format(new Date(job.shift_date), "EEE, MMM d")}</span>
                  <span>•</span>
                  <span>{job.shift_start_time.slice(0, 5)} – {job.shift_end_time.slice(0, 5)}</span>
                </div>
              </div>
              <Badge variant="info" className="flex-shrink-0">
                ₹{job.compensation}/hour
              </Badge>
            </div>
          </div>
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="cover-letter">Cover Letter (Optional)</Label>
              <Textarea
                id="cover-letter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Optional: availability, relevant unit experience, certifications…"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Keep it short. Facilities respond faster to clear availability and relevant experience.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  track("application_dialog_cancelled", { jobSlug: job.slug || job.id });
                  setShowApplyDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskAuthSheet
        open={taskAuth.authOpen}
        onOpenChange={taskAuth.setAuthOpen}
        intent={taskAuth.intent}
        job={taskAuth.activeJob}
        onGoogleAuth={taskAuth.handleGoogleAuth}
        onSendOtp={taskAuth.handleSendOtp}
        onVerifyOtp={taskAuth.handleVerifyOtp}
        onEmailContinue={taskAuth.handleEmailContinue}
      />

      <MinimalOnboardingSheet
        open={taskAuth.onboardingOpen}
        onOpenChange={taskAuth.setOnboardingOpen}
        intent={taskAuth.intent}
        onComplete={taskAuth.handleOnboardingComplete}
      />
    </>
  );
}

