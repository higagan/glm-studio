export type AppRole = "professional" | "hospital" | "admin";

export type NavItem = {
  to: string;
  label: string;
  /** Match job detail routes under /jobs */
  matchPrefix?: boolean;
};

export const PUBLIC_NAV_LINKS: NavItem[] = [
  { to: "/for-hospitals", label: "For Hospitals" },
  { to: "/for-professionals", label: "For Professionals" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/verification-process", label: "Verification" },
  { to: "/jobs", label: "Browse Jobs", matchPrefix: true },
];

export const PROFESSIONAL_NAV_LINKS: NavItem[] = [
  { to: "/jobs", label: "Browse Jobs", matchPrefix: true },
  { to: "/dashboard", label: "My Applications" },
];

export const HOSPITAL_NAV_LINKS: NavItem[] = [{ to: "/dashboard", label: "Dashboard" }];

export const ONBOARDING_ALLOWED_PATHS = new Set([
  "/complete-profile",
  "/auth",
  "/reset-password",
]);

export function getLogoHome(role: AppRole | null, isAuthed: boolean): string {
  if (!isAuthed) return "/";
  if (role === "hospital") return "/dashboard";
  if (role === "professional" || role === "admin") return "/jobs";
  return "/";
}

export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
