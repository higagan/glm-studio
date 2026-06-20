import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Save, Loader2, CheckCircle2, User, Briefcase } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const SPECIALIZATIONS = [
  "Registered Nurse (RN)",
  "Licensed Practical Nurse (LPN)",
  "Nurse Practitioner (NP)",
  "Certified Nursing Assistant (CNA)",
  "Emergency Room Nurse",
  "ICU Nurse",
  "Pediatric Nurse",
  "Surgical Nurse",
  "Oncology Nurse",
  "Psychiatry Nurse",
  "Geriatric Nurse",
  "Cardiac Nurse",
  "Neonatal Nurse",
  "Critical Care Nurse",
  "Other",
];

export default function ProfessionalProfile() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [formData, setFormData] = useState({
    specialization: "",
    experience_years: "",
    qualifications: "",
    bio: "",
    full_name: "",
    phone: "",
  });

  const calculateProfileCompletion = (profData: any, userData: any) => {
    const fields = [
      userData?.full_name,
      userData?.phone,
      profData?.specialization,
      profData?.experience_years,
      profData?.qualifications,
      profData?.bio,
    ];
    const filledFields = fields.filter((f) => f && f.toString().trim() !== "").length;
    return Math.round((filledFields / fields.length) * 100);
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let professionalUserId = id;

      if (!id && user) {
        professionalUserId = user.id;
        setIsOwnProfile(true);
      } else if (id && user && id === user.id) {
        setIsOwnProfile(true);
      }

      if (!professionalUserId) {
        navigate("/dashboard");
        return;
      }

      const [{ data: profData, error: profError }, { data: userData, error: userError }] =
        await Promise.all([
          supabase.from("professional_profiles").select("*").eq("user_id", professionalUserId).single(),
          supabase.from("profiles").select("*").eq("id", professionalUserId).single(),
        ]);

      if (profError) throw profError;
      if (userError) throw userError;

      setProfile(profData);
      setUserProfile(userData);
      setProfileCompletion(calculateProfileCompletion(profData, userData));
      setFormData({
        specialization: profData.specialization || "",
        experience_years: profData.experience_years?.toString() || "",
        qualifications: profData.qualifications || "",
        bio: profData.bio || "",
        full_name: userData.full_name || "",
        phone: userData.phone || "",
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [{ error: profError }, { error: userError }] = await Promise.all([
        supabase.from("professional_profiles").update({
          specialization: formData.specialization,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
          qualifications: formData.qualifications,
          bio: formData.bio,
        }).eq("user_id", user.id),
        supabase.from("profiles").update({
          full_name: formData.full_name,
          phone: formData.phone,
        }).eq("id", user.id),
      ]);

      if (profError) throw profError;
      if (userError) throw userError;

      toast({ title: "Profile saved", description: "Your profile has been updated." });
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completionColor =
    profileCompletion >= 100 ? "text-success" : profileCompletion >= 70 ? "text-primary" : "text-warning";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">
                  {userProfile?.full_name || "My Profile"}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Progress value={profileCompletion} className="w-28 h-1.5" />
                  <span className={`text-xs font-medium ${completionColor}`}>
                    {profileCompletion}%
                  </span>
                </div>
              </div>
            </div>
            {isOwnProfile && (
              <div className="flex gap-2 flex-shrink-0">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); fetchProfile(); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardContent className="p-6 md:p-8 space-y-8">

            {/* Avatar + name row */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">
                  {userProfile?.full_name || "—"}
                </p>
                <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                {profile?.specialization && (
                  <Badge variant="secondary" className="mt-1 text-xs">{profile.specialization}</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Personal Info */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="h-4 w-4" /> Personal
              </h2>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Full Name</p>
                    <p className="font-medium">{userProfile?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Phone</p>
                    <p className="font-medium">{userProfile?.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Email</p>
                    <p className="font-medium">{userProfile?.email}</p>
                  </div>
                </div>
              )}
            </section>

            <Separator />

            {/* Professional Details */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Professional
              </h2>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="specialization">Specialization *</Label>
                    <Select
                      value={formData.specialization}
                      onValueChange={(v) => setFormData({ ...formData, specialization: v })}
                    >
                      <SelectTrigger id="specialization">
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALIZATIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="experience_years">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      min="0"
                      value={formData.experience_years}
                      onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="qualifications">Qualifications & Certifications</Label>
                    <Textarea
                      id="qualifications"
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      placeholder={"BSN - Bachelor of Science in Nursing\nRN License\nACLS Certified"}
                      rows={4}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="bio">About You</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="A brief intro about your background, skills, and what you bring to a team..."
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground mb-0.5">Specialization</p>
                      {profile?.specialization
                        ? <Badge variant="secondary">{profile.specialization}</Badge>
                        : <p className="font-medium text-muted-foreground">—</p>}
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Experience</p>
                      <p className="font-medium">
                        {profile?.experience_years ? `${profile.experience_years} years` : "—"}
                      </p>
                    </div>
                  </div>
                  {profile?.qualifications && (
                    <div>
                      <p className="text-muted-foreground mb-1">Qualifications</p>
                      <p className="whitespace-pre-wrap font-medium">{profile.qualifications}</p>
                    </div>
                  )}
                  {profile?.bio && (
                    <div>
                      <p className="text-muted-foreground mb-1">About</p>
                      <p className="whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
                    </div>
                  )}
                  {!profile?.qualifications && !profile?.bio && !isEditing && (
                    <p className="text-muted-foreground italic text-sm">
                      Add qualifications and a bio to improve your visibility to hospitals.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Completion status — view mode only */}
            {!isEditing && profileCompletion < 100 && (
              <>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-warning" />
                    <span>Profile is <strong className={completionColor}>{profileCompletion}%</strong> complete — hospitals prefer complete profiles</span>
                  </div>
                  {isOwnProfile && (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      Complete now
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
