import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit,
  ExternalLink,
  Loader2,
  MapPin,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import GoogleLocationAutocomplete from "@/components/ui/google-location-autocomplete";
import { HospitalProfileMissingFields } from "@/components/dashboard/HospitalProfileMissingFields";
import { HospitalDashboardShell } from "@/components/dashboard/hospital/HospitalDashboardShell";
import {
  getHospitalProfileCompletionPercent,
  getPostingBlockerLabels,
  isHospitalProfileReadyForPosting,
  type HospitalProfileRecord,
} from "@/lib/hospital-profile-readiness";

type HospitalProfile = HospitalProfileRecord & {
  id: string;
  slug: string | null;
};

export default function HospitalSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "1");
  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [location, setLocation] = useState({
    address: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [formData, setFormData] = useState({
    hospital_name: "",
    city: "",
    state: "",
    description: "",
  });

  const profileCompletion = getHospitalProfileCompletionPercent(profile);
  const profileReady = isHospitalProfileReadyForPosting(profile);
  const completionColor =
    profileCompletion >= 100
      ? "text-success"
      : profileCompletion >= 70
        ? "text-primary"
        : "text-warning";

  useEffect(() => {
    void fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.role !== "hospital") {
        navigate("/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("hospital_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        hospital_name: data.hospital_name || "",
        city: data.city || "",
        state: data.state || "",
        description: data.description || "",
      });

      const addressParts = [data.address, data.city, data.state].filter(Boolean).join(", ");
      setLocation({
        address: data.address || addressParts || "",
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch (error) {
      console.error("Error fetching hospital profile:", error);
      toast({
        title: "Error",
        description: "Failed to load hospital profile",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!profile) return;
    setFormData({
      hospital_name: profile.hospital_name || "",
      city: profile.city || "",
      state: profile.state || "",
      description: profile.description || "",
    });
    const addressParts = [profile.address, profile.city, profile.state]
      .filter(Boolean)
      .join(", ");
    setLocation({
      address: profile.address || addressParts || "",
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
    });
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!formData.hospital_name.trim()) {
      toast({
        title: "Hospital name required",
        description: "Please enter your hospital name.",
        variant: "destructive",
      });
      return;
    }

    if (!location.latitude || !location.longitude) {
      toast({
        title: "Location required",
        description: "Select a valid address from the suggestions so we can verify your location.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from("hospital_profiles")
        .update({
          hospital_name: formData.hospital_name.trim(),
          address: location.address.trim(),
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          description: formData.description.trim() || null,
          latitude: location.latitude,
          longitude: location.longitude,
        })
        .eq("id", profile.id)
        .select("*")
        .single();

      if (error) throw error;
      if (!updated) {
        throw new Error("Profile update did not save. Please sign in again and retry.");
      }

      if (!isHospitalProfileReadyForPosting(updated)) {
        const blockers = getPostingBlockerLabels(updated);
        toast({
          title: "Saved, but profile still incomplete",
          description: blockers.join(" · "),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile saved",
          description: "Your hospital profile is ready — you can post shifts.",
        });
      }

      setIsEditing(false);
      setProfile(updated);
      setFormData({
        hospital_name: updated.hospital_name || "",
        city: updated.city || "",
        state: updated.state || "",
        description: updated.description || "",
      });
      setLocation({
        address: updated.address || "",
        latitude: updated.latitude,
        longitude: updated.longitude,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
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

  return (
    <HospitalDashboardShell
      hospitalName={profile?.hospital_name || "Hospital"}
      onPostShift={() => navigate("/dashboard?action=post-shift")}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">Hospital Settings</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Progress value={profileCompletion} className="w-28 h-1.5" />
                <span className={`text-xs font-medium ${completionColor}`}>
                  {profileCompletion}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
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
        </div>
        {!profileReady && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex flex-col sm:flex-row sm:items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="font-medium text-foreground text-sm">
                  Complete your profile to post shifts
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Finish the required fields below. Pick your address from the Google dropdown so
                  we can capture map coordinates.
                </p>
              </div>
              <HospitalProfileMissingFields profile={profile} postingOnly />
            </div>
            {!isEditing && (
              <Button size="sm" onClick={() => setIsEditing(true)} className="flex-shrink-0">
                Complete now
              </Button>
            )}
          </div>
        )}

        <Card>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-lg truncate">
                  {profile?.hospital_name || "Your hospital"}
                </p>
                <p className="text-sm text-muted-foreground">Hospital account</p>
                {profile?.slug && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Public profile live
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Hospital details
              </h2>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="hospital_name">Hospital name *</Label>
                    <Input
                      id="hospital_name"
                      value={formData.hospital_name}
                      onChange={(e) =>
                        setFormData({ ...formData, hospital_name: e.target.value })
                      }
                      placeholder="e.g. Kauvery Hospital"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description">About your hospital</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Brief description shown on your public profile — specialties, bed count, what makes you a great place to work..."
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Hospital name</p>
                    <p className="font-medium">{profile?.hospital_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">About</p>
                    <p className="font-medium whitespace-pre-wrap leading-relaxed">
                      {profile?.description || (
                        <span className="text-muted-foreground italic">
                          Add a description to help professionals learn about your hospital.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </h2>
              {isEditing ? (
                <div className="space-y-4">
                  <GoogleLocationAutocomplete
                    value={location}
                    onChange={(next) => {
                      setLocation(next);
                      if (next.city) setFormData((prev) => ({ ...prev, city: next.city! }));
                      if (next.state) setFormData((prev) => ({ ...prev, state: next.state! }));
                    }}
                    label="Hospital address *"
                    required
                    placeholder="Search for your hospital address..."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Bengaluru"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. Karnataka"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pick an address from the dropdown so we can pin your hospital on the map.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="sm:col-span-2">
                    <p className="text-muted-foreground mb-0.5">Address</p>
                    <p className="font-medium">{profile?.address || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">City</p>
                    <p className="font-medium">{profile?.city || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">State</p>
                    <p className="font-medium">{profile?.state || "—"}</p>
                  </div>
                </div>
              )}
            </section>

            {profile?.slug && (
              <>
                <Separator />
                <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Public profile</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      See how professionals view your hospital on MediBrick.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => navigate(`/hospitals/${profile.slug}`)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View public profile
                  </Button>
                </section>
              </>
            )}

            {!isEditing && profileCompletion < 100 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-warning" />
                    <span>
                      Profile is{" "}
                      <strong className={completionColor}>{profileCompletion}%</strong> complete —
                      optional fields help you attract more applicants
                    </span>
                  </div>
                  <HospitalProfileMissingFields profile={profile} postingOnly={false} />
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      Complete now
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </HospitalDashboardShell>
  );
}
