import { getServiceSupabase } from "./admin-auth.js";
import { FUNNEL_EVENTS, QUICK_LINKS } from "./founder-constants.js";

export type Trend = "up" | "down" | "flat" | null;

export interface MetricWithTrend {
  value: number;
  previous: number;
  trend: Trend;
}

export interface TrackedMetric {
  value: number | null;
  label: string;
  tracked: boolean;
  note?: string;
}

export interface FounderMetricsPayload {
  fetchedAt: string;
  executiveSummary: {
    openJobs: MetricWithTrend;
    newShiftPosts7d: MetricWithTrend;
    fillRatePct: MetricWithTrend;
    noShowRatePct: TrackedMetric;
    applications7d: MetricWithTrend;
    repeatHospitals: MetricWithTrend;
    applicationsPerJob: { value: number; label: string };
    topCity: string;
    topSpecialty: string;
    healthierThanLastWeek: boolean | null;
  };
  marketplaceHealth: {
    openShifts: number;
    filledShifts: number;
    closedShifts: number;
    fillRatePct: number | null;
    avgHoursToFill: number | null;
    noShowRatePct: TrackedMetric;
  };
  hospitalRetention: {
    hospitalsPostedThisMonth: number;
    returningHospitals: number;
    repeatPostingRatePct: number | null;
    jobsPerHospital: number | null;
  };
  professionalQuality: {
    verifiedProfessionals: MetricWithTrend;
    profileCompletionRatePct: number | null;
    applicationsPerJob: number | null;
    acceptanceRatePct: number | null;
    applicationToHireRatePct: number | null;
  };
  trust: {
    verifiedHospitals: number;
    verifiedProfessionals: number;
    avgHospitalRating: number | null;
    avgProfessionalRating: TrackedMetric;
    noShowRatePct: TrackedMetric;
    paymentSlaHours: TrackedMetric;
    avgTimeToPaymentHours: TrackedMetric;
    disputesReported: TrackedMetric;
    disputesResolved: TrackedMetric;
  };
  geography: Array<{
    city: string;
    jobs: number;
    applications: number;
    activeProfessionals: number;
    activeHospitals: number;
  }>;
  specialty: Array<{
    category: string;
    jobs: number;
    applications: number;
    conversionRatePct: number | null;
    fillRatePct: number | null;
  }>;
  virality: {
    jobsShared: MetricWithTrend;
    hospitalProfilesShared: MetricWithTrend;
    whatsappShares: MetricWithTrend;
    shareToViewRatePct: number | null;
    shareToApplicationRatePct: number | null;
    attribution: Record<string, number>;
  };
  growth: {
    jobViewsToday: MetricWithTrend;
    applyClicksToday: MetricWithTrend;
    applicationsSubmittedToday: MetricWithTrend;
    conversionRate: { value: number | null; label: string };
  };
  marketplace: {
    openJobs: number;
    activeHospitals: number;
    activeProfessionals: number;
    applicationsLast7d: number;
    jobsCreatedLast7d: number;
  };
  funnel: Array<{
    event: string;
    today: number;
    yesterday: number;
    trend: Trend;
  }>;
  operations: {
    pendingHospitalVerifications: number;
    pendingProfessionalVerifications: number;
    failedNotifications24h: number;
    expiredJobsPending: number;
    jobsExpiredLast24h: number;
  };
  systemHealth: {
    sentry: {
      unresolved24h: number | null;
      status: "ok" | "warning" | "unconfigured" | "error";
      message: string;
    };
    cron: {
      status: string;
      active: boolean | null;
      lastRun: string | null;
      failures24h: number | null;
    };
    edgeFunctionFailures24h: number;
    slowQueryCount: number | null;
  };
  quickLinks: typeof QUICK_LINKS;
}

function istDayBounds(offsetDays = 0): { since: string; until: string } {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const y = istNow.getUTCFullYear();
  const m = istNow.getUTCMonth();
  const d = istNow.getUTCDate() - offsetDays;
  const dayStartIst = Date.UTC(y, m, d, 0, 0, 0) - istOffsetMs;
  const dayEndIst = Date.UTC(y, m, d + 1, 0, 0, 0) - istOffsetMs;
  return { since: new Date(dayStartIst).toISOString(), until: new Date(dayEndIst).toISOString() };
}

function weekBounds(weeksAgo: number): { since: string; until: string } {
  const until = new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
  const since = new Date(until.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { since: since.toISOString(), until: until.toISOString() };
}

function computeTrend(today: number, yesterday: number): Trend {
  if (today > yesterday) return "up";
  if (today < yesterday) return "down";
  return "flat";
}

function withTrend(today: number, yesterday: number): MetricWithTrend {
  return { value: today, previous: yesterday, trend: computeTrend(today, yesterday) };
}

function untracked(note: string): TrackedMetric {
  return { value: null, label: "—", tracked: false, note };
}

const SPECIALTY_LABELS: Record<string, string> = {
  doctors: "Doctors",
  nurses: "Nurses",
  ayush: "AYUSH",
  technicians: "Technicians",
  physiotherapists: "Physiotherapists",
  lab_staff: "Lab Staff",
  other: "Other",
};

async function getNewShiftPostsCount(
  supabase: ReturnType<typeof getServiceSupabase>,
  since: string,
  until: string
): Promise<number> {
  const { count, error } = await supabase
    .from("job_posts")
    .select("id", { count: "exact", head: true })
    .eq("is_seed_data", false)
    .gte("created_at", since)
    .lt("created_at", until);
  if (error) return 0;
  return count ?? 0;
}

async function getEventCount(
  supabase: ReturnType<typeof getServiceSupabase>,
  eventName: string,
  since: string,
  until: string
): Promise<number> {
  const { count, error } = await supabase
    .from("product_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", eventName)
    .gte("created_at", since)
    .lt("created_at", until);
  if (error) return 0;
  return count ?? 0;
}

async function getShareCountByChannel(
  supabase: ReturnType<typeof getServiceSupabase>,
  eventName: string,
  channel: string,
  since: string,
  until: string
): Promise<number> {
  const { count, error } = await supabase
    .from("product_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", eventName)
    .gte("created_at", since)
    .lt("created_at", until)
    .filter("properties->>channel", "eq", channel);
  if (error) return 0;
  return count ?? 0;
}

async function fetchSentrySummary(): Promise<FounderMetricsPayload["systemHealth"]["sentry"]> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) {
    return {
      unresolved24h: null,
      status: "unconfigured",
      message: "Set SENTRY_AUTH_TOKEN in Vercel env",
    };
  }
  try {
    const res = await fetch(
      "https://sentry.io/api/0/projects/medibrick/medibrick-frontend/issues/?query=is:unresolved&statsPeriod=24h",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      return { unresolved24h: null, status: "error", message: `Sentry API ${res.status}` };
    }
    const data = await res.json();
    const count = Array.isArray(data) ? data.length : 0;
    return {
      unresolved24h: count,
      status: count > 5 ? "warning" : "ok",
      message: count === 0 ? "No unresolved issues (24h)" : `${count} unresolved issue(s)`,
    };
  } catch {
    return { unresolved24h: null, status: "error", message: "Sentry API unreachable" };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDashboardRpc(data: unknown): Record<string, any> {
  if (!data || typeof data !== "object") return {};
  return data as Record<string, any>;
}

export async function fetchFounderMetrics(): Promise<FounderMetricsPayload> {
  const supabase = getServiceSupabase();
  const today = istDayBounds(0);
  const yesterday = istDayBounds(1);
  const thisWeek = weekBounds(0);
  const lastWeek = weekBounds(1);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const todayDate = new Date().toISOString().slice(0, 10);

  const [
    dashboardRes,
    jobViewsToday,
    jobViewsYesterday,
    applyClicksToday,
    applyClicksYesterday,
    appsSubmittedToday,
    appsSubmittedYesterday,
    businessMetrics,
    activeHospitalsRes,
    activeProfessionalsRes,
    pendingHospitals,
    pendingProfessionals,
    failedNotifications,
    expiredJobsPending,
    jobsExpiredLast24h,
    cronStatus,
    slowQueryCount,
    sentrySummary,
    funnelCounts,
    jobsSharedWeek,
    jobsSharedLastWeek,
    hospitalSharedWeek,
    hospitalSharedLastWeek,
    whatsappWeek,
    whatsappLastWeek,
    jobViewsWeek,
    appsWeek,
    appsLastWeek,
    newShiftsThisWeek,
    newShiftsLastWeek,
  ] = await Promise.all([
    supabase.rpc("admin_get_founder_dashboard"),
    getEventCount(supabase, "job_viewed", today.since, today.until),
    getEventCount(supabase, "job_viewed", yesterday.since, yesterday.until),
    getEventCount(supabase, "apply_clicked", today.since, today.until),
    getEventCount(supabase, "apply_clicked", yesterday.since, yesterday.until),
    getEventCount(supabase, "application_submitted", today.since, today.until),
    getEventCount(supabase, "application_submitted", yesterday.since, yesterday.until),
    supabase.from("business_metrics").select("*").single(),
    supabase.from("job_posts").select("hospital_id").eq("status", "open"),
    supabase.from("applications").select("professional_id").gte("created_at", sevenDaysAgo),
    supabase.from("hospital_profiles").select("id", { count: "exact", head: true }).eq("is_verified", false).eq("is_seed_data", false),
    supabase.from("professional_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending").eq("is_seed_data", false),
    supabase.from("notification_delivery_log").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", twentyFourHoursAgo),
    supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("status", "open").lt("shift_date", todayDate),
    supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("status", "closed").gte("updated_at", twentyFourHoursAgo).lt("shift_date", todayDate),
    supabase.rpc("admin_get_cron_status"),
    supabase.rpc("admin_get_slow_query_count"),
    fetchSentrySummary(),
    Promise.all(
      FUNNEL_EVENTS.map(async (event) => {
        const [t, y] = await Promise.all([
          getEventCount(supabase, event, today.since, today.until),
          getEventCount(supabase, event, yesterday.since, yesterday.until),
        ]);
        return { event, today: t, yesterday: y, trend: computeTrend(t, y) };
      })
    ),
    getEventCount(supabase, "job_shared", thisWeek.since, thisWeek.until),
    getEventCount(supabase, "job_shared", lastWeek.since, lastWeek.until),
    getEventCount(supabase, "hospital_shared", thisWeek.since, thisWeek.until),
    getEventCount(supabase, "hospital_shared", lastWeek.since, lastWeek.until),
    getShareCountByChannel(supabase, "job_shared", "whatsapp", thisWeek.since, thisWeek.until),
    getShareCountByChannel(supabase, "job_shared", "whatsapp", lastWeek.since, lastWeek.until),
    getEventCount(supabase, "job_viewed", thisWeek.since, thisWeek.until),
    supabase.from("applications").select("id, job_posts!inner(is_seed_data)", { count: "exact", head: true }).eq("is_seed_data", false).eq("job_posts.is_seed_data", false).gte("created_at", thisWeek.since),
    supabase.from("applications").select("id, job_posts!inner(is_seed_data)", { count: "exact", head: true }).eq("is_seed_data", false).eq("job_posts.is_seed_data", false).gte("created_at", lastWeek.since).lt("created_at", lastWeek.until),
    getNewShiftPostsCount(supabase, thisWeek.since, thisWeek.until),
    getNewShiftPostsCount(supabase, lastWeek.since, lastWeek.until),
  ]);

  const dash = dashboardRes.error
    ? {}
    : parseDashboardRpc(dashboardRes.data);
  const mh = dash.marketplaceHealth ?? {};
  const hr = dash.hospitalRetention ?? {};
  const pq = dash.professionalQuality ?? {};
  const trust = dash.trust ?? {};
  const geography = (dash.geography ?? []) as FounderMetricsPayload["geography"];
  const specialty = (dash.specialty ?? []) as FounderMetricsPayload["specialty"];
  const attribution = (dash.attribution ?? {}) as Record<string, number>;

  const bm = businessMetrics.data as Record<string, number> | null;
  const activeHospitalIds = new Set(
    (activeHospitalsRes.data || []).map((r: { hospital_id: string }) => r.hospital_id)
  );
  const activeProfessionalIds = new Set(
    (activeProfessionalsRes.data || []).map((r: { professional_id: string }) => r.professional_id)
  );

  const conversionRate =
    jobViewsToday > 0 ? Math.round((appsSubmittedToday / jobViewsToday) * 1000) / 10 : null;

  const cron = (cronStatus.data as Record<string, unknown>) || {};
  const apps7d = appsWeek.count ?? 0;
  const appsPrev7d = appsLastWeek.count ?? 0;
  const openJobs = mh.openShifts ?? bm?.open_jobs ?? 0;
  const fillRate = mh.fillRatePct ?? null;
  const fillRatePrev = mh.fillRatePctPrev ?? null;

  const topGeo = geography[0];
  const topSpec = specialty.find((s) => s.category !== "other") ?? specialty[0];
  const shareToView =
    jobsSharedWeek > 0 ? Math.round((jobViewsWeek / jobsSharedWeek) * 1000) / 10 : null;
  const shareToApp =
    jobsSharedWeek > 0 ? Math.round((apps7d / jobsSharedWeek) * 1000) / 10 : null;

  const healthierSignals = [
    apps7d > appsPrev7d,
    (pq.applicationsLast7d ?? apps7d) > (pq.applicationsPrev7d ?? appsPrev7d),
    jobsSharedWeek > jobsSharedLastWeek,
    newShiftsThisWeek > newShiftsLastWeek,
  ];
  const healthierThanLastWeek =
    healthierSignals.filter(Boolean).length >= 2 ? true : healthierSignals.filter((x) => !x).length >= 2 ? false : null;

  const noShowMetric: TrackedMetric = untracked("Shift attendance tracking not enabled yet");

  return {
    fetchedAt: new Date().toISOString(),
    executiveSummary: {
      openJobs: { value: openJobs, previous: openJobs, trend: null },
      newShiftPosts7d: withTrend(newShiftsThisWeek, newShiftsLastWeek),
      fillRatePct: withTrend(fillRate ?? 0, fillRatePrev ?? 0),
      noShowRatePct: noShowMetric,
      applications7d: withTrend(apps7d, appsPrev7d),
      repeatHospitals: withTrend(hr.returningHospitals ?? 0, hr.returningHospitalsPrevMonth ?? 0),
      applicationsPerJob: {
        value: pq.applicationsPerJob ?? bm?.applications_per_open_job ?? 0,
        label: String(pq.applicationsPerJob ?? bm?.applications_per_open_job ?? "—"),
      },
      topCity: topGeo?.city ?? "—",
      topSpecialty: topSpec ? SPECIALTY_LABELS[topSpec.category] ?? topSpec.category : "—",
      healthierThanLastWeek,
    },
    marketplaceHealth: {
      openShifts: mh.openShifts ?? 0,
      filledShifts: mh.filledShifts ?? 0,
      closedShifts: mh.closedShifts ?? 0,
      fillRatePct: mh.fillRatePct ?? null,
      avgHoursToFill: mh.avgHoursToFill ?? null,
      noShowRatePct: noShowMetric,
    },
    hospitalRetention: {
      hospitalsPostedThisMonth: hr.hospitalsPostedThisMonth ?? 0,
      returningHospitals: hr.returningHospitals ?? 0,
      repeatPostingRatePct: hr.repeatPostingRatePct ?? null,
      jobsPerHospital: hr.jobsPerHospital ?? null,
    },
    professionalQuality: {
      verifiedProfessionals: withTrend(
        pq.verifiedProfessionals ?? 0,
        pq.verifiedProfessionalsPrev7d ?? 0
      ),
      profileCompletionRatePct: pq.profileCompletionRatePct ?? null,
      applicationsPerJob: pq.applicationsPerJob ?? null,
      acceptanceRatePct: pq.acceptanceRatePct ?? null,
      applicationToHireRatePct: pq.applicationToHireRatePct ?? null,
    },
    trust: {
      verifiedHospitals: trust.verifiedHospitals ?? 0,
      verifiedProfessionals: trust.verifiedProfessionals ?? 0,
      avgHospitalRating: trust.avgHospitalRating ?? null,
      avgProfessionalRating: untracked("Professional ratings coming in Sprint 2"),
      noShowRatePct: noShowMetric,
      paymentSlaHours: untracked("Payment tracking not enabled yet"),
      avgTimeToPaymentHours: untracked("Payment tracking not enabled yet"),
      disputesReported: untracked("Dispute tracking not enabled yet"),
      disputesResolved: untracked("Dispute tracking not enabled yet"),
    },
    geography,
    specialty,
    virality: {
      jobsShared: withTrend(jobsSharedWeek, jobsSharedLastWeek),
      hospitalProfilesShared: withTrend(hospitalSharedWeek, hospitalSharedLastWeek),
      whatsappShares: withTrend(whatsappWeek, whatsappLastWeek),
      shareToViewRatePct: shareToView,
      shareToApplicationRatePct: shareToApp,
      attribution,
    },
    growth: {
      jobViewsToday: withTrend(jobViewsToday, jobViewsYesterday),
      applyClicksToday: withTrend(applyClicksToday, applyClicksYesterday),
      applicationsSubmittedToday: withTrend(appsSubmittedToday, appsSubmittedYesterday),
      conversionRate: {
        value: conversionRate,
        label: conversionRate !== null ? `${conversionRate}%` : "—",
      },
    },
    marketplace: {
      openJobs: bm?.open_jobs ?? 0,
      activeHospitals: activeHospitalIds.size,
      activeProfessionals: activeProfessionalIds.size,
      applicationsLast7d: bm?.applications_last_7d ?? 0,
      jobsCreatedLast7d: bm?.jobs_posted_last_7d ?? 0,
    },
    funnel: funnelCounts,
    operations: {
      pendingHospitalVerifications: pendingHospitals.count ?? 0,
      pendingProfessionalVerifications: pendingProfessionals.count ?? 0,
      failedNotifications24h: failedNotifications.count ?? 0,
      expiredJobsPending: expiredJobsPending.count ?? 0,
      jobsExpiredLast24h: jobsExpiredLast24h.count ?? 0,
    },
    systemHealth: {
      sentry: sentrySummary,
      cron: {
        status: String(cron.status ?? "unknown"),
        active: cron.active as boolean | null,
        lastRun: (cron.last_run as string) ?? null,
        failures24h: (cron.failures_24h as number) ?? null,
      },
      edgeFunctionFailures24h: failedNotifications.count ?? 0,
      slowQueryCount: slowQueryCount.data as number | null,
    },
    quickLinks: QUICK_LINKS,
  };
}
