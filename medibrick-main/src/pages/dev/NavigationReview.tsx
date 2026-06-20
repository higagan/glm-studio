import { useSearchParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import Navigation from "@/components/Navigation";
import { NavAuthOverrideProvider } from "@/contexts/NavAuthOverrideContext";
import type { NavAuthState } from "@/hooks/useNavAuth";
import type { AppRole } from "@/lib/nav-config";

const PREVIEW_USER = { id: "nav-preview", email: "preview@medibrick.com" } as User;

type PreviewView = "logged-out" | "professional" | "hospital" | "onboarding";

function buildPreviewState(view: PreviewView): NavAuthState {
  switch (view) {
    case "logged-out":
      return {
        loading: false,
        user: null,
        role: null,
        displayName: null,
        avatarUrl: null,
        hospitalSlug: null,
        needsOnboarding: false,
      };
    case "onboarding":
      return {
        loading: false,
        user: PREVIEW_USER,
        role: null,
        displayName: "New User",
        avatarUrl: null,
        hospitalSlug: null,
        needsOnboarding: true,
      };
    case "hospital":
      return {
        loading: false,
        user: PREVIEW_USER,
        role: "hospital",
        displayName: "City General Hospital",
        avatarUrl: null,
        hospitalSlug: "city-general",
        needsOnboarding: false,
      };
    case "professional":
    default:
      return {
        loading: false,
        user: PREVIEW_USER,
        role: "professional" as AppRole,
        displayName: "Dr. Priya Sharma",
        avatarUrl: null,
        hospitalSlug: null,
        needsOnboarding: false,
      };
  }
}

export default function NavigationReview() {
  const [params] = useSearchParams();
  const view = (params.get("view") as PreviewView) || "logged-out";
  const mock = buildPreviewState(view);

  return (
    <NavAuthOverrideProvider value={mock}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="border-t bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
          Navigation preview — {view.replace("-", " ")}
        </div>
      </div>
    </NavAuthOverrideProvider>
  );
}
