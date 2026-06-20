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

  /** Phase 15 — 10-second founder health check */
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

  /** Phase 8 */
  marketplaceHealth: {
    openShifts: number;
    filledShifts: number;
    closedShifts: number;
    fillRatePct: number | null;
    avgHoursToFill: number | null;
    noShowRatePct: TrackedMetric;
  };

  /** Phase 9 */
  hospitalRetention: {
    hospitalsPostedThisMonth: number;
    returningHospitals: number;
    repeatPostingRatePct: number | null;
    jobsPerHospital: number | null;
  };

  /** Phase 10 */
  professionalQuality: {
    verifiedProfessionals: MetricWithTrend;
    profileCompletionRatePct: number | null;
    applicationsPerJob: number | null;
    acceptanceRatePct: number | null;
    applicationToHireRatePct: number | null;
  };

  /** Phase 11 */
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

  /** Phase 12 */
  geography: Array<{
    city: string;
    jobs: number;
    applications: number;
    activeProfessionals: number;
    activeHospitals: number;
  }>;

  /** Phase 13 */
  specialty: Array<{
    category: string;
    jobs: number;
    applications: number;
    conversionRatePct: number | null;
    fillRatePct: number | null;
  }>;

  /** Phase 14 */
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
  quickLinks: {
    vercelAnalytics: string;
    vercelSpeedInsights: string;
    sentry: string;
    supabaseLogs: string;
    supabaseSql: string;
  };
}

export const SPECIALTY_LABELS: Record<string, string> = {
  doctors: "Doctors",
  nurses: "Nurses",
  ayush: "AYUSH",
  technicians: "Technicians",
  physiotherapists: "Physiotherapists",
  lab_staff: "Lab Staff",
  other: "Other",
};
