import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/product-analytics";
import { supabase } from "@/integrations/supabase/client";
import {
  buildPostAuthReturnUrl,
  clearAuthRedirect,
  clearPostShiftIntent,
  hasPendingApply,
  hasPendingPostShift,
  resolveReturnPath,
} from "@/lib/auth-redirect";
import { markApplyOnboardingReady } from "@/lib/apply-readiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, UserCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import {
  HEALTHCARE_ROLE_CATEGORIES,
  type HealthcareRoleCategory,
} from "@/lib/healthcare-roles";
import { cn } from "@/lib/utils";

type UserRole = "hospital" | "professional";

export default function MinimalProfileDetails() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [applyIntent] = useState(() => hasPendingApply());
  const [postIntent] = useState(() => hasPendingPostShift());
  const taskFlow = applyIntent || postIntent;

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    postIntent ? "hospital" : "professional",
  );
  const [fullName, setFullName] = useState("");
  const [roleCategory, setRoleCategory] = useState<HealthcareRoleCategory | "">("");
  const [city, setCity] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        track("profile_started", { path: "/complete-profile", taskFlow });
      }
    });
  }, [navigate, taskFlow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const role = taskFlow
        ? postIntent
          ? "hospital"
          : "professional"
        : selectedRole;

      const name =
        role === "hospital" && taskFlow ? fullName.trim() : fullName.trim();

      if (!name) throw new Error("Name is required");
      if (role === "hospital" && taskFlow && !city.trim()) {
        throw new Error("City is required");
      }
      if (role === "professional" && taskFlow && !roleCategory) {
        throw new Error("Select your role");
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: name,
        email: user.email || null,
        phone: user.phone || null,
      });
      if (profileError) throw profileError;

      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: user.id,
          role,
        });
        if (roleError) throw roleError;
      }

      if (role === "hospital") {
        track("hospital_signup_started", { source: "complete_profile" });
        const { error: hospitalError } = await supabase.from("hospital_profiles").upsert({
          user_id: user.id,
          hospital_name: name,
          ...(city.trim() ? { city: city.trim() } : {}),
        });
        if (hospitalError) throw hospitalError;
        track("hospital_signup_completed", { source: "complete_profile" });
      } else {
        const { error: professionalError } = await supabase.from("professional_profiles").upsert({
          user_id: user.id,
          specialization: roleCategory || "General",
        });
        if (professionalError) throw professionalError;
      }

      track("profile_completed", {
        role,
        source: taskFlow ? "task_flow_complete_profile" : "complete_profile",
      });

      if (role === "professional" && hasPendingApply()) {
        markApplyOnboardingReady();
      }

      if (postIntent) {
        clearPostShiftIntent();
      }

      const destination = buildPostAuthReturnUrl(resolveReturnPath());
      clearAuthRedirect();

      toast({
        title: taskFlow ? "You're all set" : "Profile completed!",
        description: taskFlow
          ? postIntent
            ? "Continuing to post your shift…"
            : "Finishing your application…"
          : "Your profile has been set up successfully.",
      });

      navigate(destination);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to complete profile";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const title = taskFlow
    ? postIntent
      ? "Your facility"
      : "Almost there"
    : "Complete your profile";
  const subtitle = taskFlow
    ? postIntent
      ? "Two details — then you can publish your shift."
      : "Two details — then we'll finish your application."
    : "Tell us who you are to get started.";

  const submitLabel = taskFlow
    ? postIntent
      ? "Continue posting"
      : "Continue & apply"
    : "Complete profile";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-73px)]">
        <Card className="w-full max-w-md shadow-lg border border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center font-heading">{title}</CardTitle>
            <CardDescription className="text-center">{subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {taskFlow && postIntent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Hospital / clinic name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Apollo Multispeciality"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Indore"
                      className="h-11"
                      required
                    />
                  </div>
                </>
              ) : taskFlow && applyIntent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Your full name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="As it appears on your license"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <div className="flex flex-wrap gap-2">
                      {HEALTHCARE_ROLE_CATEGORIES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setRoleCategory(role)}
                          className={cn(
                            "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                            roleCategory === role
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:bg-muted/60",
                          )}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>I am a</Label>
                    <RadioGroup
                      value={selectedRole}
                      onValueChange={(value) => setSelectedRole(value as UserRole)}
                    >
                      <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="professional" id="professional" />
                        <Label htmlFor="professional" className="flex items-center cursor-pointer flex-1">
                          <UserCircle className="mr-3 h-5 w-5 text-primary" />
                          <div>
                            <div className="font-medium">Healthcare Professional</div>
                            <div className="text-xs text-muted-foreground">Find and apply for shifts</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="hospital" id="hospital" />
                        <Label htmlFor="hospital" className="flex items-center cursor-pointer flex-1">
                          <Building2 className="mr-3 h-5 w-5 text-primary" />
                          <div>
                            <div className="font-medium">Healthcare Facility</div>
                            <div className="text-xs text-muted-foreground">Post jobs and find staff</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
