import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  Clock,
  IndianRupee,
  Loader2,
  LocateFixed,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { track } from "@/lib/product-analytics";
import { useNearbyDiscovery } from "@/hooks/useNearbyDiscovery";
import type { HospitalHiringRow, NearbyPosting, PopularShiftRow } from "@/lib/nearby-discovery-types";
import {
  Briefcase,
  Building2,
  NearbyDistanceBadge,
  NearbyListRow,
  NearbyMarketplaceStats,
  NearbySectionHeading,
  NearbyShiftBadge,
} from "@/components/location/NearbyDiscoverySections";
import { cn } from "@/lib/utils";

const DEFAULT_LOCATION = { lat: 12.9716, lng: 77.5946 };

function formatPay(amount: number | null) {
  if (amount == null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}/hr`;
}

function LocationCtaCard({
  className,
  isLoading,
  locationError,
  userLocation,
  locationGranted,
  onUseLocation,
  onRefresh,
}: {
  className?: string;
  isLoading: boolean;
  locationError: string;
  userLocation: { lat: number; lng: number } | null;
  locationGranted: boolean;
  onUseLocation: () => void;
  onRefresh: () => void;
}) {
  return (
    <Card className={cn("border-primary/20 shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {locationGranted ? "Location enabled" : "Find Nearby Shifts"}
        </CardTitle>
        <CardDescription>
          {locationGranted
            ? "Showing shifts within 50 km of you."
            : "Enable location to see distance, hospitals, and shifts around you."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onUseLocation} className="w-full" disabled={isLoading} size="lg">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="mr-2 h-4 w-4" />
          )}
          {locationGranted ? "Refresh Location" : "Use My Location"}
        </Button>

        {locationError && (
          <p className="text-sm text-muted-foreground text-center">{locationError}</p>
        )}

        {userLocation && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </span>
            </span>
            {locationGranted && (
              <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HospitalsHiringList({
  hospitals,
  loading,
  onHospitalClick,
}: {
  hospitals: HospitalHiringRow[];
  loading?: boolean;
  onHospitalClick: (h: HospitalHiringRow) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!hospitals.length) {
    return <p className="text-sm text-muted-foreground py-2">No hospitals hiring right now.</p>;
  }
  return (
    <div className="space-y-2">
      {hospitals.map((h) => (
        <NearbyListRow
          key={h.id}
          title={h.hospital_name}
          meta={h.city}
          trailing={<NearbyShiftBadge>{h.open_shifts} shift{h.open_shifts === 1 ? "" : "s"}</NearbyShiftBadge>}
          onClick={() => onHospitalClick(h)}
        />
      ))}
    </div>
  );
}

function PopularShiftsList({
  shifts,
  loading,
  onShiftClick,
}: {
  shifts: PopularShiftRow[];
  loading?: boolean;
  onShiftClick: (shift: PopularShiftRow, source: "popular" | "nearby") => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!shifts.length) {
    return <p className="text-sm text-muted-foreground py-2">No open shifts at the moment.</p>;
  }
  return (
    <div className="space-y-2">
      {shifts.map((s) => (
        <NearbyListRow
          key={s.id}
          title={s.title}
          meta={`${s.hospital_name} · ${s.city} · ${formatPay(s.compensation)}`}
          trailing={
            <NearbyShiftBadge>{format(new Date(s.shift_date), "MMM d")}</NearbyShiftBadge>
          }
          onClick={() => onShiftClick(s, "popular")}
        />
      ))}
    </div>
  );
}

function NearbyShiftCard({
  posting,
  onShiftClick,
  onNavigate,
}: {
  posting: NearbyPosting;
  onShiftClick: (posting: NearbyPosting) => void;
  onNavigate: (hospital: NearbyPosting["hospital"]) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => onShiftClick(posting)}
        >
          <div className="flex justify-between items-start mb-2 gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-snug">{posting.title}</h3>
              <p className="text-sm text-muted-foreground truncate">{posting.hospital.hospital_name}</p>
            </div>
            <NearbyDistanceBadge>{posting.distance_km} km</NearbyDistanceBadge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {format(new Date(posting.shift_date), "MMM d")} ·{" "}
                {posting.shift_start_time.slice(0, 5)}–{posting.shift_end_time.slice(0, 5)}
              </span>
            </div>
            {posting.compensation != null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                <span>{formatPay(posting.compensation)}</span>
              </div>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {posting.hospital.address || `${posting.hospital.city}, ${posting.hospital.state}`}
          </span>
        </div>

        <div className="flex gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            {posting.required_specialization}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {posting.department}
          </Badge>
        </div>

        <Button className="w-full" variant="outline" onClick={() => onNavigate(posting.hospital)}>
          <Navigation className="mr-2 h-4 w-4" />
          Navigate
        </Button>
      </CardContent>
    </Card>
  );
}

export function DoctorDiscoveryList() {
  const navigate = useNavigate();
  const { data: discovery, loading: discoveryLoading, error: discoveryError, refresh: refreshDiscovery } =
    useNearbyDiscovery();

  const [postings, setPostings] = useState<NearbyPosting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    track("nearby_page_viewed", { path: "/nearby" });
  }, []);

  const fetchNearbyPostings = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("staff-nearby-postings", {
        body: { lat, lng, radius_km: 50 },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setPostings(data.postings || []);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load nearby postings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        setLocationGranted(true);
        track("location_permission_granted", {
          lat: loc.lat,
          lng: loc.lng,
        });
        toast.success("Location detected!");
        fetchNearbyPostings(loc.lat, loc.lng);
      },
      (error) => {
        setIsLoading(false);
        console.error("Geolocation error:", error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Browse popular shifts below.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Browse popular shifts below.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Browse popular shifts below.");
            break;
          default:
            setLocationError("Could not get location. Browse popular shifts below.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleRefreshLocation = () => {
    if (userLocation) {
      fetchNearbyPostings(userLocation.lat, userLocation.lng);
    } else {
      handleUseMyLocation();
    }
  };

  const openNavigate = (hospital: NearbyPosting["hospital"]) => {
    const url = `https://maps.google.com/?q=${hospital.latitude},${hospital.longitude} (${encodeURIComponent(hospital.hospital_name)})`;
    window.open(url, "_blank");
  };

  const goToJob = (slug: string | null, id: string, distanceKm?: number, source?: string) => {
    track("nearby_shift_clicked", {
      jobSlug: slug || id,
      distanceKm,
      source: source || "nearby",
    });
    navigate(`/jobs/${slug || id}`);
  };

  const goToHospital = (slug: string | null, id: string) => {
    if (slug) navigate(`/hospitals/${slug}`);
    else navigate(`/hospitals/${id}`);
  };

  const nearbyHospitals = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; slug: string | null; city: string; distance_km: number }
    >();
    for (const p of postings) {
      const h = p.hospital;
      const existing = map.get(h.id);
      if (!existing || p.distance_km < existing.distance_km) {
        map.set(h.id, {
          id: h.id,
          name: h.hospital_name,
          slug: h.slug,
          city: h.city,
          distance_km: p.distance_km,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.distance_km - b.distance_km);
  }, [postings]);

  useEffect(() => {
    const channel = supabase
      .channel("hospital-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hospital_profiles" },
        () => {
          toast.info("New hospital just joined the network!");
          void refreshDiscovery();
          if (userLocation && locationGranted) {
            fetchNearbyPostings(userLocation.lat, userLocation.lng);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation, locationGranted, refreshDiscovery]);

  const ctaProps = {
    isLoading,
    locationError,
    userLocation,
    locationGranted,
    onUseLocation: handleUseMyLocation,
    onRefresh: handleRefreshLocation,
  };

  return (
    <div className="space-y-4">
      <NearbyMarketplaceStats
        stats={discovery.stats}
        trust={discovery.trust}
        loading={discoveryLoading}
      />

      {discoveryError && (
        <p className="text-sm text-destructive">{discoveryError}</p>
      )}

      <LocationCtaCard className="lg:hidden" {...ctaProps} />

      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:items-start">
        <div className="space-y-1 min-w-0">
          <NearbySectionHeading icon={Building2}>Hospitals Hiring Now</NearbySectionHeading>
          <HospitalsHiringList
            hospitals={discovery.hospitalsHiring}
            loading={discoveryLoading}
            onHospitalClick={(h) => goToHospital(h.slug, h.id)}
          />

          <NearbySectionHeading icon={Briefcase}>Popular Shifts</NearbySectionHeading>
          <PopularShiftsList
            shifts={discovery.popularShifts}
            loading={discoveryLoading}
            onShiftClick={(s, source) => goToJob(s.slug, s.id, undefined, source)}
          />

          {locationGranted && (
            <div className="pt-4 mt-2 border-t border-primary/15">
              {isLoading && !postings.length && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {!isLoading && postings.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No shifts found within 50 km</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try popular shifts above or check back later
                    </p>
                  </CardContent>
                </Card>
              )}

              {nearbyHospitals.length > 0 && (
                <>
                  <NearbySectionHeading icon={Building2}>Nearby Hospitals</NearbySectionHeading>
                  <div className="space-y-2 mb-4">
                    {nearbyHospitals.map((h) => (
                      <NearbyListRow
                        key={h.id}
                        title={h.name}
                        meta={h.city}
                        trailing={<NearbyDistanceBadge>{h.distance_km} km</NearbyDistanceBadge>}
                        onClick={() => goToHospital(h.slug, h.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {postings.length > 0 && (
                <>
                  <NearbySectionHeading icon={Briefcase}>Nearby Shifts</NearbySectionHeading>
                  <div className="space-y-3">
                    {postings.map((posting) => (
                      <NearbyShiftCard
                        key={posting.id}
                        posting={posting}
                        onShiftClick={(p) =>
                          goToJob(p.slug, p.id, p.distance_km, "nearby_results")
                        }
                        onNavigate={openNavigate}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <LocationCtaCard className="hidden lg:block lg:sticky lg:top-24" {...ctaProps} />
      </div>
    </div>
  );
}
