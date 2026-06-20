import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import MediBricksLogo from "@/components/MediBricksLogo";
import { UserMenu } from "@/components/navigation/UserMenu";
import { useNavAuth } from "@/hooks/useNavAuth";
import { cn } from "@/lib/utils";
import {
  Bell,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Users,
  Building2,
  UserCircle,
  HelpCircle,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: "post-shift";
  active?: boolean;
  badge?: number;
  disabled?: boolean;
  onClick?: () => void;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

function SidebarNav({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();

  const handleClick = (item: NavItem) => {
    if (item.disabled) return;
    if (item.onClick) {
      item.onClick();
      onNavigate?.();
      return;
    }
    if (item.action === "post-shift") {
      navigate("/dashboard?action=post-shift");
      onNavigate?.();
      return;
    }
    if (item.href) {
      navigate(item.href);
      onNavigate?.();
    }
  };

  return (
    <nav className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.title ?? "root"}>
          {section.title && (
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    disabled={item.disabled}
                    onClick={() => handleClick(item)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left",
                      item.active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                      item.disabled && "opacity-45 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="text-xs font-semibold text-muted-foreground">({item.badge})</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function HospitalDashboardShell({
  hospitalName,
  children,
  onPostShift,
  pendingApplicants = 0,
}: {
  hospitalName: string;
  children: ReactNode;
  onPostShift: () => void;
  pendingApplicants?: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, avatarUrl, role, hospitalSlug } = useNavAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const path = location.pathname;
  const tab = new URLSearchParams(location.search).get("tab");

  const primarySections: NavSection[] = [
    {
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/dashboard",
          active: path === "/dashboard" && !tab,
        },
      ],
    },
    {
      title: "Shifts",
      items: [
        {
          label: "All Shifts",
          icon: CalendarDays,
          href: "/dashboard?tab=shifts",
          active: path === "/dashboard" && (tab === "shifts" || !tab),
        },
        { label: "Post a Shift", icon: Plus, action: "post-shift" },
        {
          label: "Drafts",
          icon: FileText,
          href: "/dashboard?tab=drafts",
          active: tab === "drafts",
          badge: 0,
          disabled: true,
        },
      ],
    },
    {
      title: "Candidates",
      items: [
        {
          label: "Applicants",
          icon: Users,
          href: "/dashboard?tab=candidates",
          active: tab === "candidates",
          badge: pendingApplicants > 0 ? pendingApplicants : undefined,
        },
        {
          label: "Shortlisted",
          icon: UserCircle,
          href: "/dashboard?tab=shortlisted",
          active: tab === "shortlisted",
          disabled: true,
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          label: "Hospital Profile",
          icon: Building2,
          onClick: () =>
            hospitalSlug ? navigate(`/hospitals/${hospitalSlug}`) : navigate("/dashboard/settings"),
          active: false,
        },
        {
          label: "Team Members",
          icon: Users,
          disabled: true,
        },
        {
          label: "Settings",
          icon: Settings,
          href: "/dashboard/settings",
          active: path === "/dashboard/settings",
        },
      ],
    },
  ];

  const sidebarFooter = (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-4">
      <p className="text-sm font-semibold text-foreground">Need help?</p>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Our team can help you post shifts and review applicants.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => window.open("mailto:support@medibrick.com", "_blank")}
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        Contact Support
      </Button>
    </div>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5 border-b border-border/60">
        <button type="button" onClick={() => navigate("/dashboard")} className="flex items-center">
          <MediBricksLogo variant="default" size="sm" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav sections={primarySections} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="p-4 border-t">{sidebarFooter}</div>
    </div>
  );

  const accountName = hospitalName || displayName || "Hospital";

  return (
    <div className="min-h-screen bg-[#f4f6fa] dark:bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-col border-r border-border/60 bg-card flex-shrink-0 sticky top-0 h-screen shadow-sm">
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 lg:px-8 h-[60px]">
            <div className="flex items-center gap-2 lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  {sidebarContent}
                </SheetContent>
              </Sheet>
              <MediBricksLogo variant="icon-only" size="sm" />
            </div>

            <div className="hidden lg:block flex-1" />

            <Button
              className="bg-primary hover:bg-primary/90 font-semibold shadow-md hover:shadow-lg transition-shadow rounded-xl px-5 h-9"
              onClick={onPostShift}
            >
              <Plus className="mr-2 h-4 w-4" />
              Post a Shift
            </Button>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
              {role && displayName && (
                <UserMenu
                  displayName={accountName}
                  avatarUrl={avatarUrl}
                  role={role}
                  hospitalSlug={hospitalSlug}
                />
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
