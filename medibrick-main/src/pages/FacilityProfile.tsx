import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Building2,
  Clock,
  Calendar,
  IndianRupee,
  ArrowLeft,
  Stethoscope,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface HospitalProfile {
  id: string;
  hospital_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  slug: string | null;
}

interface JobPost {
  id: string;
  title: string;
  department: string;
  description: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  required_specialization: string;
  compensation: number | null;
  status: string;
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function FacilityProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetchProfile();
    checkAuth();
  }, [slug]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from("professional_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) setProfessionalId(data.id);
    }
  };

  const fetchProfile = async () => {
    // Try slug first, fall back to id for backward compat
    const { data, error } = await supabase
      .from("hospital_profiles")
      .select("*")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .single();
    if (error || !data) {
      console.error(error);
      navigate("/jobs");
      return;
    }
    setProfile(data);
    fetchOpenJobs(data.id);
  };

  const fetchOpenJobs = async (hospitalId: string) => {
    const { data } = await supabase
      .from("job_posts")
      .select("*")
      .eq("hospital_id", hospitalId)
      .eq("status", "open")
      .eq("is_seed_data", false)
      .order("shift_date", { ascending: true });
    setJobs(data || []);
    setLoading(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: profile?.hospital_name, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Profile link copied to clipboard." });
    }
  };

  const handleApply = (jobId: string) => {
    if (!professionalId) {
      navigate("/auth");
      return;
    }
    navigate(`/jobs?apply=${jobId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const locationParts = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 py-10 max-w-4xl">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {profile.hospital_name}
                  </h1>
                  {(profile.address || locationParts) && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground text-sm">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{profile.address || locationParts}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </Button>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 mt-4">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Verified Facility
                </Badge>
                {jobs.length > 0 && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {jobs.length} open {jobs.length === 1 ? "shift" : "shifts"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {profile.description && (
            <p className="mt-6 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
              {profile.description}
            </p>
          )}
        </div>
      </div>

      {/* Open Shifts */}
      <main className="container mx-auto px-4 md:px-8 py-8 max-w-4xl">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {jobs.length > 0
            ? `Open Shifts (${jobs.length})`
            : "No open shifts right now"}
        </h2>

        {jobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Stethoscope className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">No shifts currently available</p>
              <p className="text-sm text-muted-foreground">
                Check back soon — this facility posts regularly.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const shiftDate = new Date(job.shift_date + "T00:00:00");
              const isToday =
                new Date().toDateString() === shiftDate.toDateString();

              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{job.title}</h3>
                          {isToday && (
                            <Badge className="text-xs bg-warning/15 text-warning border-warning/30 border">
                              Today
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(shiftDate, "EEE, MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(job.shift_start_time)} – {formatTime(job.shift_end_time)}
                          </span>
                          {job.compensation && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {job.compensation.toLocaleString("en-IN")}/hr
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <Badge variant="outline" className="text-xs">{job.department}</Badge>
                          <Badge variant="outline" className="text-xs">{job.required_specialization}</Badge>
                        </div>
                        {job.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {job.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="flex-shrink-0 self-start"
                        onClick={() => handleApply(job.id)}
                      >
                        Apply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
