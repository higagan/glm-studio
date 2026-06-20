import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/nav-config";
import { useNavAuthOverride } from "@/contexts/NavAuthOverrideContext";

export type NavAuthState = {
  loading: boolean;
  user: User | null;
  role: AppRole | null;
  displayName: string | null;
  avatarUrl: string | null;
  hospitalSlug: string | null;
  needsOnboarding: boolean;
};

const EMPTY: NavAuthState = {
  loading: true,
  user: null,
  role: null,
  displayName: null,
  avatarUrl: null,
  hospitalSlug: null,
  needsOnboarding: false,
};

export function useNavAuth(): NavAuthState {
  const override = useNavAuthOverride();
  const [state, setState] = useState<NavAuthState>(EMPTY);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setState({ ...EMPTY, loading: false });
        return;
      }

      const user = session.user;
      const [{ data: profile }, { data: roleRow }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);

      const role = (roleRow?.role as AppRole | undefined) ?? null;
      const profileComplete = !!(profile?.full_name?.trim() && role);
      let hospitalSlug: string | null = null;

      if (role === "hospital") {
        const { data: hospital } = await supabase
          .from("hospital_profiles")
          .select("slug")
          .eq("user_id", user.id)
          .maybeSingle();
        hospitalSlug = hospital?.slug ?? null;
      }

      setState({
        loading: false,
        user,
        role,
        displayName: profile?.full_name ?? user.email?.split("@")[0] ?? "User",
        avatarUrl: null,
        hospitalSlug,
        needsOnboarding: !profileComplete,
      });
    } catch {
      setState({ ...EMPTY, loading: false });
    }
  }, []);

  useEffect(() => {
    if (override) return;
    void load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        void load();
      }
    });

    return () => subscription.unsubscribe();
  }, [load, override]);

  if (override) return override;

  return state;
}
