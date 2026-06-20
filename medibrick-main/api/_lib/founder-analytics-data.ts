import { getServiceSupabase } from "./admin-auth.js";
import type {
  AcquisitionPayload,
  ActionsPayload,
  ConfidencePayload,
  DropoffPayload,
  FunnelPayload,
  FounderAnalyticsSection,
  JourneysPayload,
  RecoveryDetailPayload,
  RecoveryPayload,
  ReconciliationPayload,
  HospitalLeaderboardsPayload,
  TestSuitePayload,
  TimelinePayload,
  VerificationPayload,
  VerificationRecordsPayload,
} from "../../src/lib/founder-analytics-types.js";

function parseDays(raw: unknown, fallback = 7): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(90, Math.floor(n));
}

function parseLimit(raw: unknown, fallback = 50): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(200, Math.floor(n));
}

function parseHours(raw: unknown, fallback = 24): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(168, Math.floor(n));
}

function parseOffset(raw: unknown, fallback = 0): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(10000, Math.floor(n));
}

export async function fetchFounderAnalytics(
  section: FounderAnalyticsSection,
  query: Record<string, string | string[] | undefined>,
): Promise<unknown> {
  const supabase = getServiceSupabase();
  const days = parseDays(query.days);

  switch (section) {
    case "funnels": {
      const { data, error } = await supabase.rpc("admin_get_application_funnel", { p_days: days });
      if (error) throw new Error(error.message);
      return data as FunnelPayload;
    }
    case "hospital": {
      const { data, error } = await supabase.rpc("admin_get_hospital_funnel", { p_days: days });
      if (error) throw new Error(error.message);
      return data as FunnelPayload;
    }
    case "dropoffs": {
      const { data, error } = await supabase.rpc("admin_get_dropoff_analysis", { p_days: days });
      if (error) throw new Error(error.message);
      return data as DropoffPayload;
    }
    case "acquisition": {
      const { data, error } = await supabase.rpc("admin_get_acquisition_breakdown", { p_days: days });
      if (error) throw new Error(error.message);
      return data as AcquisitionPayload;
    }
    case "journeys": {
      const limit = parseLimit(query.limit);
      const { data, error } = await supabase.rpc("admin_get_user_journeys", {
        p_days: days,
        p_limit: limit,
      });
      if (error) throw new Error(error.message);
      return data as JourneysPayload;
    }
    case "timeline": {
      const sessionId = typeof query.sessionId === "string" ? query.sessionId.trim() : "";
      if (!sessionId) throw new Error("sessionId required");
      const { data, error } = await supabase.rpc("admin_get_session_timeline", {
        p_session_id: sessionId,
      });
      if (error) throw new Error(error.message);
      return data as TimelinePayload;
    }
    case "recovery": {
      const limit = parseLimit(query.limit, 100);
      const segment = typeof query.segment === "string" ? query.segment : "all";
      const { data, error } = await supabase.rpc("admin_get_founder_recovery", {
        p_days: days,
        p_segment: segment,
        p_limit: limit,
      });
      if (error) throw new Error(error.message);
      return data as RecoveryPayload;
    }
    case "recovery_detail": {
      const sessionId = typeof query.sessionId === "string" ? query.sessionId.trim() : null;
      const userId = typeof query.userId === "string" ? query.userId.trim() : null;
      if (!sessionId && !userId) throw new Error("sessionId or userId required");
      const { data, error } = await supabase.rpc("admin_get_recovery_detail", {
        p_session_id: sessionId || null,
        p_user_id: userId || null,
      });
      if (error) throw new Error(error.message);
      return data as RecoveryDetailPayload;
    }
    case "actions": {
      const hours = parseHours(query.hours);
      const { data, error } = await supabase.rpc("admin_get_founder_actions", {
        p_hours: hours,
      });
      if (error) throw new Error(error.message);
      return data as ActionsPayload;
    }
    case "debug": {
      const { data, error } = await supabase.rpc("admin_get_founder_metric_verification");
      if (error) throw new Error(error.message);
      return data as VerificationPayload;
    }
    case "debug_records": {
      const metric = typeof query.metric === "string" ? query.metric.trim() : "";
      if (!metric) throw new Error("metric required");
      const limit = parseLimit(query.limit, 100);
      const offset = parseOffset(query.offset, 0);
      const { data, error } = await supabase.rpc("admin_get_founder_metric_records", {
        p_metric_key: metric,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw new Error(error.message);
      return data as VerificationRecordsPayload;
    }
    case "reconciliation": {
      const { data, error } = await supabase.rpc("admin_get_founder_reconciliation");
      if (error) throw new Error(error.message);
      return data as ReconciliationPayload;
    }
    case "confidence": {
      const { data, error } = await supabase.rpc("admin_get_analytics_confidence");
      if (error) throw new Error(error.message);
      return data as ConfidencePayload;
    }
    case "test_suite": {
      const { data, error } = await supabase.rpc("admin_get_analytics_test_suite");
      if (error) throw new Error(error.message);
      return data as TestSuitePayload;
    }
    case "hospital_leaderboards": {
      const { data, error } = await supabase.rpc("admin_get_hospital_leaderboards", { p_days: days });
      if (error) throw new Error(error.message);
      return data as HospitalLeaderboardsPayload;
    }
    default:
      throw new Error("Invalid section");
  }
}
