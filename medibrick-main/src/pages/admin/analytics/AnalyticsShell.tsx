import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  BarChart3,
  Filter,
  FlaskConical,
  GitCompare,
  LayoutDashboard,
  Loader2,
  LogOut,
  Route as RouteIcon,
  Settings,
  Shield,
  UserCheck,
  Users,
  Zap,
  Bug,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminGate } from "@/hooks/useAdminGate";
import { getFounderGateToken } from "@/lib/founder-gate";
import OverviewPage from "./OverviewPage";
import MarketplacePage from "./MarketplacePage";
import AnalyticsFunnelsPage from "./FunnelsPage";
import AnalyticsJourneysPage from "./JourneysPage";
import RecoveryPage from "./RecoveryPage";
import TrustPage from "./TrustPage";
import HospitalsLeaderboardPage from "./HospitalsLeaderboardPage";
import AnalyticsAcquisitionPage from "./AcquisitionPage";
import ActionsPage from "./ActionsPage";
import DebugPage from "./DebugPage";
import ReconciliationPage from "./ReconciliationPage";
import TestSuitePage from "./TestSuitePage";

const TABS = [
  {
    path: "actions",
    label: "Action Center",
    question: "What should I work on today?",
    icon: Zap,
  },
  {
    path: "marketplace",
    label: "Marketplace Health",
    question: "Is the marketplace solving staffing reliability?",
    icon: Activity,
  },
  {
    path: "overview",
    label: "Executive Summary",
    question: "Is Medibrick healthier this week than last week?",
    icon: LayoutDashboard,
  },
  {
    path: "trust",
    label: "Trust",
    question: "Is Medibrick earning marketplace trust?",
    icon: Shield,
  },
  {
    path: "hospitals",
    label: "Hospital Profiles",
    question: "Which hospitals earn discovery and trust?",
    icon: Building2,
  },
  {
    path: "funnels",
    label: "Funnels",
    question: "Where are users dropping?",
    icon: Filter,
  },
  {
    path: "journeys",
    label: "User Journeys",
    question: "What exactly happened?",
    icon: RouteIcon,
  },
  {
    path: "recovery",
    label: "Recovery",
    question: "Who should I contact today?",
    icon: UserCheck,
  },
  {
    path: "acquisition",
    label: "Acquisition",
    question: "Where are users coming from?",
    icon: Users,
  },
  {
    path: "reconciliation",
    label: "Reconciliation",
    question: "Do independent sources agree?",
    icon: GitCompare,
  },
  {
    path: "test-suite",
    label: "Test Suite",
    question: "Are automated checks passing?",
    icon: FlaskConical,
  },
  {
    path: "debug",
    label: "Verification",
    question: "Can I trust every number?",
    icon: Bug,
  },
] as const;

export function useAnalyticsFetch<T>(
  section: string,
  days: number,
  options?: { limit?: string; segment?: string; hours?: string },
) {
  const limit = options?.limit;
  const segment = options?.segment;
  const hours = options?.hours;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getFounderGateToken();
      if (!token) throw new Error("Not authenticated");
      const params = new URLSearchParams({ section, days: String(days) });
      if (limit) params.set("limit", limit);
      if (segment) params.set("segment", segment);
      if (hours) params.set("hours", hours);
      const res = await fetch(`/api/founder-analytics?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [section, days, limit, segment, hours]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function PeriodSelect({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  return (
    <select
      className="h-9 rounded-md border bg-background px-3 text-sm"
      value={days}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value={7}>Last 7 days</option>
      <option value={14}>Last 14 days</option>
      <option value={30}>Last 30 days</option>
    </select>
  );
}

export function LeakBanner({ leak }: { leak: { from: string; to: string; dropOffPct: number } | null }) {
  if (!leak || leak.dropOffPct <= 0) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 text-xs font-bold">
        !
      </div>
      <div>
        <p className="font-medium text-amber-900 dark:text-amber-100">Biggest leak</p>
        <p className="text-muted-foreground">
          {leak.from} → {leak.to}: <span className="font-semibold text-foreground">{leak.dropOffPct}%</span> drop-off
        </p>
      </div>
    </div>
  );
}

export function FunnelTable({
  steps,
}: {
  steps: {
    label: string;
    count: number;
    conversionPct: number;
    dropOffPct: number | null;
    changeVsPreviousPct: number | null;
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Step</th>
            <th className="px-4 py-3 text-right font-medium">Count</th>
            <th className="px-4 py-3 text-right font-medium">Conversion</th>
            <th className="px-4 py-3 text-right font-medium">Drop-off</th>
            <th className="px-4 py-3 text-right font-medium">vs prev</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.label} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{step.label}</td>
              <td className="px-4 py-3 text-right tabular-nums">{step.count}</td>
              <td className="px-4 py-3 text-right tabular-nums">{step.conversionPct}%</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {step.dropOffPct != null ? `${step.dropOffPct}%` : "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {step.changeVsPreviousPct == null ? (
                  "—"
                ) : (
                  <span
                    className={cn(
                      step.changeVsPreviousPct > 0 ? "text-emerald-600" : step.changeVsPreviousPct < 0 ? "text-red-600" : "",
                    )}
                  >
                    {step.changeVsPreviousPct > 0 ? "+" : ""}
                    {step.changeVsPreviousPct}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsNav({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const activeTab = TABS.find((t) => location.pathname.endsWith(`/${t.path}`)) ?? TABS[0];

  return (
    <div className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Founder Analytics</h1>
              <p className="text-xs text-muted-foreground">{activeTab.question}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/manage">
                <Settings className="mr-1 h-4 w-4" />
                Manage
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="mr-1 h-4 w-4" />
              Lock
            </Button>
          </div>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-0.5 overflow-x-auto px-4 pb-0">
        {TABS.map(({ path, label, icon: Icon }) => {
          const href = `/admin/analytics/${path}`;
          const active = location.pathname === href || location.pathname.endsWith(`/${path}`);
          return (
            <Link
              key={path}
              to={href}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AnalyticsShell() {
  const { loading: authLoading, isAuthed, logout } = useAdminGate();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Founder access required.</p>
        <Button asChild>
          <Link to="/admin/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AnalyticsNav onLogout={logout} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route index element={<Navigate to="actions" replace />} />
          <Route path="actions" element={<ActionsPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="trust" element={<TrustPage />} />
          <Route path="hospitals" element={<HospitalsLeaderboardPage />} />
          <Route path="funnels" element={<AnalyticsFunnelsPage />} />
          <Route path="journeys" element={<AnalyticsJourneysPage />} />
          <Route path="recovery" element={<RecoveryPage />} />
          <Route path="acquisition" element={<AnalyticsAcquisitionPage />} />
          <Route path="reconciliation" element={<ReconciliationPage />} />
          <Route path="test-suite" element={<TestSuitePage />} />
          <Route path="debug" element={<DebugPage />} />
          <Route path="dropoffs" element={<Navigate to="/admin/analytics/funnels" replace />} />
          <Route path="hospital" element={<Navigate to="/admin/analytics/funnels" replace />} />
          <Route path="*" element={<Navigate to="/admin/analytics/actions" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Applied Successfully"
      ? "default"
      : status.startsWith("Dropped")
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className="font-normal">
      {status}
    </Badge>
  );
}

export function formatRelativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function formatEventTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
