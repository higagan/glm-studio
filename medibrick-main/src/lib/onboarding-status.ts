import { supabase } from "@/integrations/supabase/client";

export type UserRole = "professional" | "hospital";

export type OnboardingStatus = {
  hasName: boolean;
  hasRole: boolean;
  role: UserRole | null;
  isComplete: boolean;
};

export async function fetchOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  const role = (roleRow?.role as UserRole | undefined) ?? null;
  const hasName = !!profile?.full_name?.trim();
  const hasRole = !!role;

  return {
    hasName,
    hasRole,
    role,
    isComplete: hasName && hasRole,
  };
}
