import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/product-analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HEALTHCARE_ROLE_CATEGORIES, type HealthcareRoleCategory } from "@/lib/healthcare-roles";
import { markApplyOnboardingReady } from "@/lib/apply-readiness";
import { hasPendingApply } from "@/lib/auth-redirect";
import type { TaskAuthIntent } from "@/hooks/useTaskAuthFlow";
import { cn } from "@/lib/utils";

type MinimalOnboardingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: TaskAuthIntent;
  onComplete: () => void;
};

export function MinimalOnboardingSheet({
  open,
  onOpenChange,
  intent,
  onComplete,
}: MinimalOnboardingSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [roleCategory, setRoleCategory] = useState<HealthcareRoleCategory | "">("");
  const [hospitalName, setHospitalName] = useState("");
  const [city, setCity] = useState("");

  const isHospital = intent === "post_shift";
  const title = isHospital ? "Your facility" : "Almost there";
  const subtitle = isHospital
    ? "Two details — then you can publish your shift."
    : "Two details — then we'll finish your application.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const selectedRole = isHospital ? "hospital" : "professional";
      const name = isHospital ? hospitalName.trim() : fullName.trim();

      if (!name) throw new Error("Name is required");
      if (isHospital && !city.trim()) throw new Error("City is required");
      if (!isHospital && !roleCategory) throw new Error("Select your role");

      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: name,
        email: user.email || null,
        phone: user.phone || null,
      });

      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: user.id,
          role: selectedRole,
        });
        if (roleError) throw roleError;
      }

      if (isHospital) {
        await supabase.from("hospital_profiles").upsert({
          user_id: user.id,
          hospital_name: hospitalName.trim(),
          city: city.trim(),
        });
        track("hospital_signup_completed", { source: "minimal_onboarding_sheet" });
      } else {
        await supabase.from("professional_profiles").upsert({
          user_id: user.id,
          specialization: roleCategory,
        });
        if (hasPendingApply()) {
          markApplyOnboardingReady();
        }
      }

      track("profile_completed", {
        role: selectedRole,
        source: "minimal_onboarding_sheet",
        intent,
      });

      onComplete();
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Something went wrong";
      toast({ title: "Couldn't save", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-xl font-heading">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isHospital ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="hospital-name">Hospital / clinic name</Label>
                <Input
                  id="hospital-name"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. Apollo Multispeciality"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospital-city">City</Label>
                <Input
                  id="hospital-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Indore"
                  className="h-11"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="pro-name">Your full name</Label>
                <Input
                  id="pro-name"
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
          )}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isHospital ? "Continue posting" : "Continue & apply"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
