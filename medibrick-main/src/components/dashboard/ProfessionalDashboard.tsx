import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Briefcase, Search, UserCircle, CheckCircle2, Clock4, XCircle, ArrowRight, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ApplicationsTracking from "./ApplicationsTracking";
import ProfileCompletionCard from "./ProfileCompletionCard";
import ProfessionalVerificationCard from "./ProfessionalVerificationCard";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { normalizeVerificationStatus, VERIFICATION_META } from "@/lib/verification";
import Navigation from "@/components/Navigation";

interface ProfessionalDashboardProps {
  user: User;
}

export default function ProfessionalDashboard({ user }: ProfessionalDashboardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [professionalProfile, setProfessionalProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [{ data: profData }, { data: userData }] = await Promise.all([
        supabase.from("professional_profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).single(),
      ]);

      setProfessionalProfile(profData);
      setUserProfile(userData);

      // Check profile completion (same logic as ProfileCompletionCard)
      const fields = [
        userData?.full_name,
        userData?.phone,
        profData?.specialization,
        profData?.experience_years,
        profData?.qualifications,
        profData?.bio,
      ];
      const filled = fields.filter(f => f && f.toString().trim() !== "").length;
      setProfileComplete(filled / fields.length >= 0.7);

      if (profData?.id) {
        const { data: apps } = await supabase
          .from("applications")
          .select("status")
          .eq("professional_id", profData.id);

        const appList = apps || [];
        setStats({
          total: appList.length,
          pending: appList.filter(a => a.status === "pending").length,
          accepted: appList.filter(a => a.status === "accepted").length,
          rejected: appList.filter(a => a.status === "rejected").length,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out", description: "You've been successfully logged out." });
    navigate("/");
  };

  const firstName = userProfile?.full_name?.split(" ")[0] || "there";
  const verificationStatus = normalizeVerificationStatus(professionalProfile?.verification_status);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">
              Welcome back, {firstName} 👋
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {professionalProfile?.specialization && (
                <p className="text-sm text-muted-foreground truncate">
                  {professionalProfile.specialization}
                </p>
              )}
              {verificationStatus === "verified" && (
                <Badge variant="success" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {verificationStatus === "pending" && (
                <Badge variant="warning">{VERIFICATION_META.pending.label}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/jobs")}
              className="hidden sm:flex items-center gap-1.5 text-xs"
            >
              <Search className="h-3.5 w-3.5" />
              Browse Shifts
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/jobs")} className="sm:hidden" title="Browse Shifts">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} title="My Profile">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* Credential verification — hidden once verified to keep the dashboard clean */}
        {professionalProfile?.id && verificationStatus !== "verified" && (
          <ProfessionalVerificationCard
            userId={user.id}
            status={verificationStatus}
            licenseNumber={professionalProfile?.license_number}
            notes={professionalProfile?.verification_notes}
            onSubmitted={fetchData}
          />
        )}

        {/* Profile completion nudge — only shown if incomplete */}
        {!profileComplete && (
          <ProfileCompletionCard
            userId={user.id}
            professionalProfileId={professionalProfile?.id}
            onRefresh={fetchData}
          />
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Applied</span>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">shifts applied</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</span>
                <Clock4 className="h-4 w-4 text-warning" />
              </div>
              <div className="text-3xl font-bold text-warning">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">awaiting reply</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Accepted</span>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="text-3xl font-bold text-success">{stats.accepted}</div>
              <p className="text-xs text-muted-foreground mt-1">shifts confirmed</p>
            </CardContent>
          </Card>
        </div>

        {/* My Applications — the hero section */}
        {professionalProfile?.id ? (
          <ApplicationsTracking professionalId={professionalProfile.id} />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">Complete your profile first</p>
              <p className="text-sm text-muted-foreground mb-6">
                Set up your professional profile to start applying to shifts.
              </p>
              <Button onClick={() => navigate("/profile")}>
                Complete Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Browse CTA — shown only when no applications */}
        {stats.total === 0 && professionalProfile?.id && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div>
                <p className="font-semibold text-foreground">Ready to find your first shift?</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Browse verified facilities near you and apply in seconds.
                </p>
              </div>
              <Button onClick={() => navigate("/jobs")} className="flex-shrink-0 w-full sm:w-auto">
                <Search className="mr-2 h-4 w-4" />
                Browse Shifts
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
