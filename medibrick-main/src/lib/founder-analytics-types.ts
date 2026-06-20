export type FunnelStep = {
  event: string;
  label: string;
  count: number;
  conversionPct: number;
  dropOffPct: number | null;
  changeVsPreviousPct: number | null;
};

export type FunnelPayload = {
  periodDays: number;
  steps: FunnelStep[];
  biggestLeak: { from: string; to: string; dropOffPct: number } | null;
};

export type DropoffStage = {
  stage: string;
  count: number;
  pct: number;
  trendPct: number | null;
};

export type DropoffPayload = {
  periodDays: number;
  stages: DropoffStage[];
  totalDropoffs: number;
};

export type AcquisitionRow = {
  source: string;
  visitors: number;
  job_views: number;
  apply_clicks: number;
  applications: number;
  conversion_pct: number;
};

export type AcquisitionPayload = {
  periodDays: number;
  sources: AcquisitionRow[];
};

export type UserJourney = {
  session_id: string;
  user_id: string | null;
  display_name: string;
  source: string;
  last_activity: string;
  journey_status: string;
  event_count: number;
};

export type JourneysPayload = {
  periodDays: number;
  journeys: UserJourney[];
};

export type TimelineEvent = {
  event: string;
  label: string;
  at: string;
  page: string | null;
  jobId: string | null;
  hospitalId: string | null;
  source: string | null;
  properties: Record<string, unknown>;
};

export type TimelinePayload = {
  sessionId: string;
  events: TimelineEvent[];
};

export type RecoveryUser = {
  session_id: string;
  user_id: string | null;
  anonymous_id: string | null;
  name: string;
  user_role?: string | null;
  phone_masked: string | null;
  has_phone: boolean;
  email: string | null;
  has_email: boolean;
  source: string;
  dropoff_stage: string;
  last_activity: string;
  seconds_since_activity: number;
  high_intent: boolean;
  primary_job_id: string | null;
  primary_job_views: number;
};

export type RecoverySegment = {
  segment: string;
  key: string;
  count: number;
};

export type RecoveryPayload = {
  periodDays: number;
  segment: string;
  segments: RecoverySegment[];
  highIntent: RecoveryUser[];
  users: RecoveryUser[];
};

export type RecoveryDetailPayload = {
  sessionId: string | null;
  userId: string | null;
  anonymousId: string | null;
  contact: {
    name: string;
    phone: string | null;
    phoneMasked: string | null;
    email: string | null;
  };
  context: {
    jobsViewed: string[];
    hospitalsViewed: string[];
    searchTerms: string[];
    filtersApplied: number;
    applicationSubmitted: boolean;
    dropoffStage: string | null;
  };
  events: TimelineEvent[];
};

export type FounderActionSeverity = "high" | "medium" | "low";

export type FounderActionCategory = "funnel" | "recovery" | "marketplace";

export type FounderAction = {
  id: string;
  severity: FounderActionSeverity;
  category: FounderActionCategory;
  title: string;
  impact: string;
  suggestedAction: string;
  investigateHref: string;
  priority: number;
};

export type ActionsPayload = {
  generatedAt: string;
  periodHours: number;
  summary: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  actions: FounderAction[];
};

export type VerificationMetric = {
  key: string;
  label: string;
  value: string;
  valueNumeric: number | null;
  rawCount: number;
  sourceTables: string[];
  sourceEvents: string[];
  sql: string;
  calculatedAt: string;
  tracked: boolean;
  note: string | null;
  category?: string;
};

export type ReconciliationComparison = {
  key: string;
  label: string;
  sourceA: { label: string; value: number | null };
  sourceB: { label: string; value: number | null };
  difference: number;
  status: "OK" | "WARNING" | "ERROR";
};

export type ReconciliationPayload = {
  generatedAt: string;
  comparisons: ReconciliationComparison[];
};

export type ConfidenceDeduction = {
  reason: string;
  points: number;
  detail: string | null;
};

export type ConfidencePayload = {
  generatedAt: string;
  score: number;
  label: string;
  deductions: ConfidenceDeduction[];
};

export type TestSuiteItem = {
  id: string;
  name: string;
  status: "PASS" | "WARNING" | "FAIL";
  detail: string;
};

export type TestSuitePayload = {
  generatedAt: string;
  summary: { pass: number; warning: number; fail: number; total: number };
  tests: TestSuiteItem[];
};

export type VerificationPayload = {
  generatedAt: string;
  metrics: VerificationMetric[];
};

export type VerificationRecordsPayload = {
  metricKey: string;
  total: number;
  limit: number;
  offset: number;
  calculatedAt: string;
  records: Record<string, unknown>[];
};

export type HospitalLeaderboardRow = {
  slug: string;
  name: string;
  views?: number;
  rating?: number;
  review_count?: number;
  applies?: number;
  conversion_pct?: number | null;
  repeat_rate?: number | null;
};

export type HospitalLeaderboardsPayload = {
  periodDays: number;
  mostViewed: HospitalLeaderboardRow[];
  bestRated: HospitalLeaderboardRow[];
  highestConversion: HospitalLeaderboardRow[];
  highestRepeat: HospitalLeaderboardRow[];
};

export type FounderAnalyticsSection =
  | "funnels"
  | "hospital"
  | "dropoffs"
  | "acquisition"
  | "journeys"
  | "timeline"
  | "recovery"
  | "recovery_detail"
  | "actions"
  | "debug"
  | "debug_records"
  | "reconciliation"
  | "confidence"
  | "test_suite"
  | "hospital_leaderboards";
