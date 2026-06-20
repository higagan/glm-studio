import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Loader2, Plus } from "lucide-react";
import MediBricksLogo from "@/components/MediBricksLogo";
import { useNavAuth } from "@/hooks/useNavAuth";
import {
  HOSPITAL_NAV_LINKS,
  PROFESSIONAL_NAV_LINKS,
  PUBLIC_NAV_LINKS,
  ONBOARDING_ALLOWED_PATHS,
  getLogoHome,
  type NavItem,
  type AppRole,
} from "@/lib/nav-config";
import { NavLinkItem } from "@/components/navigation/NavLinkItem";
import { UserMenu } from "@/components/navigation/UserMenu";
import { navigateToPostShiftAuth } from "@/lib/post-shift-nav";

function resolveNavLinks(role: AppRole | null): NavItem[] {
  if (role === "hospital") return HOSPITAL_NAV_LINKS;
  if (role === "professional" || role === "admin") return PROFESSIONAL_NAV_LINKS;
  return PUBLIC_NAV_LINKS;
}

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { loading, user, role, displayName, avatarUrl, hospitalSlug, needsOnboarding } =
    useNavAuth();

  const isAuthed = !!user && !!role && !needsOnboarding;
  const logoHome = getLogoHome(role, isAuthed);
  const navLinks = needsOnboarding ? [] : resolveNavLinks(role);
  const isHospital = role === "hospital" && isAuthed;

  useEffect(() => {
    if (loading || !needsOnboarding) return;
    if (ONBOARDING_ALLOWED_PATHS.has(location.pathname)) return;
    navigate("/complete-profile", { replace: true });
  }, [loading, needsOnboarding, location.pathname, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div
          className="flex items-center cursor-pointer flex-shrink-0"
          onClick={() => navigate(needsOnboarding ? "/complete-profile" : logoHome)}
        >
          <MediBricksLogo variant="default" size="sm" />
        </div>

        {!needsOnboarding && (
          <div className="hidden lg:flex items-center gap-1">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-2" />
            ) : (
              <>
                {navLinks.map((item) => (
                  <NavLinkItem key={item.to + item.label} item={item} />
                ))}
                {isHospital && (
                  <Button
                    size="sm"
                    className="ml-3"
                    onClick={() => navigate("/dashboard?action=post-shift")}
                  >
                    <Plus className="h-4 w-4" />
                    Post shift
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : needsOnboarding ? (
            <Button onClick={() => navigate("/complete-profile")} size="sm">
              Complete profile
            </Button>
          ) : isAuthed && displayName && role ? (
            <UserMenu
              displayName={displayName}
              avatarUrl={avatarUrl}
              role={role}
              hospitalSlug={hospitalSlug}
            />
          ) : (
            <Button onClick={() => navigateToPostShiftAuth(navigate)} size="sm">
              Post a shift
            </Button>
          )}
          {!needsOnboarding && (
            <button
              className="lg:hidden p-2 rounded-md hover:bg-muted"
              onClick={() => setOpen((s) => !s)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {open && !needsOnboarding && (
        <div className="lg:hidden border-t border-border bg-card">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-1">
            {navLinks.map((item) => (
              <NavLinkItem
                key={item.to + item.label}
                item={item}
                onClick={() => setOpen(false)}
                className="py-3"
              />
            ))}
            {isHospital && (
              <Button
                onClick={() => {
                  setOpen(false);
                  navigate("/dashboard?action=post-shift");
                }}
                className="mt-2 w-full"
              >
                Post shift
              </Button>
            )}
            {!isAuthed && (
              <Button
                onClick={() => {
                  setOpen(false);
                  navigateToPostShiftAuth(navigate);
                }}
                className="mt-2 w-full"
              >
                Post a shift
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
