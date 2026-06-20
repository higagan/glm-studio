import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NearbyDiscoveryPayload } from "@/lib/nearby-discovery-types";

const EMPTY: NearbyDiscoveryPayload = {
  stats: { openShifts: 0, hiringHospitals: 0, activeProfessionals: 0 },
  trust: { verifiedHospitals: 0, professionalsPlaced: 0, avgRating: null },
  hospitalsHiring: [],
  popularShifts: [],
};

export function useNearbyDiscovery() {
  const [data, setData] = useState<NearbyDiscoveryPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: payload, error: rpcError } = await supabase.rpc("get_nearby_discovery");
      if (rpcError) throw rpcError;
      if (payload) {
        setData({
          stats: {
            openShifts: payload.stats?.openShifts ?? 0,
            hiringHospitals: payload.stats?.hiringHospitals ?? 0,
            activeProfessionals: payload.stats?.activeProfessionals ?? 0,
          },
          trust: {
            verifiedHospitals: payload.trust?.verifiedHospitals ?? 0,
            professionalsPlaced: payload.trust?.professionalsPlaced ?? 0,
            avgRating: payload.trust?.avgRating ?? null,
          },
          hospitalsHiring: payload.hospitalsHiring ?? [],
          popularShifts: payload.popularShifts ?? [],
        });
      }
    } catch (err) {
      console.error("Nearby discovery fetch error:", err);
      setError("Could not load marketplace activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
