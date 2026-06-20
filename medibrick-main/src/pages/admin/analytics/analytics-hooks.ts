import { useCallback, useEffect, useState } from "react";
import { getFounderGateToken } from "@/lib/founder-gate";
import type { FounderMetricsPayload } from "@/lib/founder-metrics-types";

export function useFounderMetrics() {
  const [metrics, setMetrics] = useState<FounderMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getFounderGateToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/founder-metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setMetrics(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { metrics, loading, error, refresh };
}
