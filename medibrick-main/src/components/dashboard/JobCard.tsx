import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { saveJobApplyRedirect } from "@/lib/auth-redirect";
import { canOpenApplyDialog, markApplyOnboardingReady } from "@/lib/apply-readiness";
import { track } from "@/lib/product-analytics";
import { useTaskAuthFlow } from "@/hooks/useTaskAuthFlow";
import { TaskAuthSheet } from "@/components/auth/TaskAuthSheet";
import { MinimalOnboardingSheet } from "@/components/auth/MinimalOnboardingSheet";
import { fetchOnboardingStatus } from "@/lib/onboarding-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, DollarSign, MapPin, Loader2, Users, Building2, Stethoscope, User, ShieldCheck } from "lucide-react";
import ApplicationsList from "./ApplicationsList";
import { format } from "date-fns";
import { calculateDistance, formatDistance, extractLocality } from "@/lib/distance";
import { hospitalProfilePath } from "@/lib/hospital-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface JobCardProps {
  job: any;
  isHospital: boolean;
  professionalId?: string;
  onUpdate: () => void;
  showLoginPrompt?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

export default function JobCard({ job, isHospital, professionalId, onUpdate, showLoginPrompt = false, userLocation }: JobCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showApplicationsList, setShowApplicationsList] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [profileCompletion, setProfileCompletion] = useState(100);
  const taskAuth = useTaskAuthFlow();

  const openApplyDialog = useCallback(() => {
    setShowApplyDialog(true);
  }, []);

  const finishApplyTask = useCallback(() => {
    markApplyOnboardingReady();
    onUpdate();
    window.setTimeout(() => openApplyDialog(), 400);
  }, [onUpdate, openApplyDialog]);

  // Check if user has already applied and profile completion
  useEffect(() => {
    const checkProfileAndApplication = async () => {
      if (professionalId && job.id) {
        // Check application status
        const { data: appData } = await supabase
          .from("applications")
          .select("id")
          .eq("job_id", job.id)
          .eq("professional_id", professionalId)
          .maybeSingle();
        
        setHasApplied(!!appData);

        // Check profile completion
        const { data: profData } = await supabase
          .from("professional_profiles")
          .select("*")
          .eq("id", professionalId)
          .single();

        if (profData) {
          // Get user profile data
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
          const filledFields = fields.filter(field => field && field.toString().trim() !== "").length;
          const completion = Math.round((filledFields / fields.length) * 100);
          setProfileCompletion(completion);
        }
      }
    };

    checkProfileAndApplication();
  }, [professionalId, job.id]);

  // Fetch application count for hospitals
  useEffect(() => {
    if (isHospital && job.id) {
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("job_id", job.id)
        .then(({ count }) => {
          setApplicationCount(count || 0);
        });
    }
  }, [isHospital, job.id]);

  const handleApplyClick = async () => {
    if (showLoginPrompt) {
      saveJobApplyRedirect(job);
      track("apply_requires_auth", {
        jobSlug: job.slug || job.id,
        jobTitle: job.title,
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
    } else if (!canOpenApplyDialog(profileCompletion, job.id, null)) {
      taskAuth.startOnboardingOnly("apply", finishApplyTask, job);
    } else {
      openApplyDialog();
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "success";
      case "filled":
        return "neutral";
      case "closed":
        return "destructive";
      default:
        return "neutral";
    }
  };

  const handleApply = async () => {
    if (!professionalId) return;
    setLoading(true);

    try {
      const { data: newApp, error } = await supabase.from("applications").insert({
        job_id: job.id,
        professional_id: professionalId,
        cover_letter: coverLetter,
      }).select("id").single();

      if (error) throw error;

      toast({
        title: "Application submitted!",
        description: "The hospital will review your application.",
      });
      setShowApplyDialog(false);
      setCoverLetter("");
      setHasApplied(true);
      onUpdate();

      // Send new application notification to hospital (fire-and-forget)
      if (newApp?.id) {
        supabase.functions.invoke("send-notification", {
          body: { type: "new_application", applicationId: newApp.id },
        }).catch(console.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: "open" | "filled" | "closed") => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("job_posts")
        .update({ status: newStatus })
        .eq("id", job.id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Job marked as ${newStatus}`,
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if description is meaningful (not placeholder/test data)
  const hasValidDescription = job.description && 
    job.description.length > 15 && 
    !job.description.match(/^[a-z\s]{1,10}$/i);

  // Only show specialization if it's different from department
  const showSpecialization = job.required_specialization && 
    job.required_specialization.toLowerCase() !== job.department.toLowerCase();

  // Calculate distance if user location is available
  const distance = userLocation && job.hospital_profiles?.latitude && job.hospital_profiles?.longitude
    ? calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        job.hospital_profiles.latitude,
        job.hospital_profiles.longitude
      )
    : null;

  // Determine location display text
  const getLocationDisplay = () => {
    // Authenticated user with GPS access - show distance
    if (distance !== null && !isHospital) {
      return formatDistance(distance);
    }
    
    // Unauthenticated or no GPS - show locality/neighborhood
    if (job.hospital_profiles?.address) {
      return extractLocality(job.hospital_profiles.address);
    }
    
    // Fallback to city if no address
    return job.hospital_profiles?.city || "Location not set";
  };

  return (
    <>
      <Card className="border border-border bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
        <CardContent className="p-5 md:p-6 space-y-5">
          {/* Job Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                {/* Job Title - Largest Element */}
                <h3 className="text-xl md:text-2xl font-bold leading-tight text-foreground">
                  {job.title}
                </h3>
                
                {/* Facility Name + Trust + Location */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={2} />
                    {!isHospital && job.hospital_profiles ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            hospitalProfilePath({
                              slug: job.hospital_profiles.slug,
                              id: job.hospital_profiles.id || job.hospital_id || job.id,
                            })
                          )
                        }
                        className="font-semibold text-primary hover:underline text-left"
                      >
                        {job.hospital_profiles.hospital_name}
                      </button>
                    ) : (
                      <span className="font-semibold text-foreground">Hospital</span>
                    )}
                  </div>
                  
                  <Badge variant="verified" className="font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secure platform
                  </Badge>
                  
                  {!isHospital && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                        <span className={`text-sm ${distance !== null ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                          {getLocationDisplay()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <Badge variant={getStatusVariant(job.status) as any} className="flex-shrink-0 font-semibold capitalize">
                {job.status === "open" ? "Open" : job.status}
              </Badge>
            </div>
            
            {/* Prominent Rate Display */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/15">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-primary flex-shrink-0" strokeWidth={2.5} />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl md:text-4xl font-extrabold text-foreground">₹{job.compensation}</span>
                    <span className="text-base font-semibold text-muted-foreground">/hour</span>
                  </div>
                </div>

                <div className="flex flex-col items-end text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {format(new Date(job.shift_date), "EEE, MMM d")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {job.shift_start_time.slice(0, 5)} – {job.shift_end_time.slice(0, 5)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-semibold text-sm truncate">{format(new Date(job.shift_date), "MMM d, yyyy")}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-semibold text-sm truncate">
                  {job.shift_start_time.slice(0, 5)} - {job.shift_end_time.slice(0, 5)}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-2 ${showSpecialization ? '' : 'col-span-2'}`}>
              <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="font-semibold text-sm truncate">{job.department}</p>
              </div>
            </div>

            {showSpecialization && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Specialization</p>
                  <p className="font-semibold text-sm truncate">{job.required_specialization}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Only show meaningful descriptions */}
          {hasValidDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{job.description}</p>
          )}

          {isHospital && (
            <div className="flex flex-col gap-3 pt-4 border-t">
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowApplicationsList(true)}
                className="w-full"
              >
                <Users className="mr-2 h-4 w-4" />
                View Applications ({applicationCount})
              </Button>
              {job.status === "open" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("filled")}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mark as Filled
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("closed")}
                    disabled={loading}
                    className="flex-1"
                  >
                    Close Position
                  </Button>
                </div>
              )}
            </div>
          )}

          {!isHospital && job.status === "open" && (
            <div className="pt-4 border-t">
              {!showLoginPrompt && profileCompletion < 70 && (
                <p className="text-sm text-destructive text-center font-medium mb-3">
                  Complete {70 - profileCompletion}% more of your profile to apply
                </p>
              )}
              {showLoginPrompt ? (
                <Button 
                  onClick={handleApplyClick} 
                  className="w-full h-12 md:h-14 text-base md:text-lg font-bold shadow-md hover:shadow-lg rounded-xl"
                  size="lg"
                >
                  Apply Now
                </Button>
              ) : (
                <Button 
                  onClick={handleApplyClick} 
                  disabled={loading || hasApplied}
                  className="w-full h-12 md:h-14 text-base md:text-lg font-bold rounded-xl"
                  size="lg"
                >
                  {loading ? "Loading..." : hasApplied ? "Already Applied" : "Apply Now"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cover-letter">Cover Letter (Optional)</Label>
              <Textarea
                id="cover-letter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Optional: availability, relevant unit experience, certifications…"
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
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

      {isHospital && (
        <ApplicationsList
          open={showApplicationsList}
          onOpenChange={setShowApplicationsList}
          jobId={job.id}
          jobTitle={job.title}
          onUpdate={onUpdate}
        />
      )}

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
