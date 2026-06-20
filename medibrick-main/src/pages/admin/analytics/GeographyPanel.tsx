import { MapPin } from "lucide-react";
import type { FounderMetricsPayload } from "@/lib/founder-metrics-types";
import { BarRow, DataTable } from "@/components/admin/founder/FounderSections";
import { Panel } from "./TabChrome";
import { cn } from "@/lib/utils";

/** Approximate coords for India city labels on the map panel */
const CITY_COORDS: Record<string, { x: number; y: number }> = {
  bangalore: { x: 42, y: 78 },
  bengaluru: { x: 42, y: 78 },
  mumbai: { x: 22, y: 52 },
  delhi: { x: 38, y: 28 },
  "new delhi": { x: 38, y: 28 },
  hyderabad: { x: 48, y: 62 },
  chennai: { x: 52, y: 88 },
  kolkata: { x: 72, y: 42 },
  pune: { x: 26, y: 58 },
  ahmedabad: { x: 18, y: 38 },
  jaipur: { x: 28, y: 32 },
  kochi: { x: 38, y: 92 },
  lucknow: { x: 44, y: 34 },
};

function cityKey(name: string) {
  return name.trim().toLowerCase();
}

export function GeographyPanel({ geography }: { geography: FounderMetricsPayload["geography"] }) {
  const maxJobs = Math.max(...geography.map((g) => g.jobs), 1);
  const maxApps = Math.max(...geography.map((g) => g.applications), 1);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Market map">
        <div className="relative aspect-[4/3] rounded-lg border bg-muted/30 overflow-hidden">
          <iframe
            title="India marketplace map"
            src="https://maps.google.com/maps?q=India&z=5&output=embed"
            className="absolute inset-0 h-full w-full border-0 opacity-40 grayscale"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {geography.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No city data yet
            </div>
          ) : (
            geography.slice(0, 8).map((g) => {
              const pos = CITY_COORDS[cityKey(g.city)];
              const intensity = g.jobs / maxJobs;
              if (!pos) {
                return null;
              }
              return (
                <div
                  key={g.city}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center rounded-full border-2 border-primary bg-primary/90 px-2 py-1 text-center shadow-lg",
                      intensity < 0.34 && "scale-75",
                      intensity >= 0.66 && "scale-110",
                    )}
                  >
                    <MapPin className="h-3 w-3 text-primary-foreground" />
                    <span className="text-[10px] font-bold text-primary-foreground leading-tight max-w-[72px] truncate">
                      {g.city}
                    </span>
                    <span className="text-[9px] text-primary-foreground/90">{g.jobs} jobs</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Pin size reflects open job volume. Unmapped cities appear in the table.
        </p>
      </Panel>

      <div className="space-y-6">
        <Panel title="Jobs by city">
          <div className="space-y-3">
            {geography.length === 0 ? (
              <p className="text-sm text-muted-foreground">No city data yet</p>
            ) : (
              geography.slice(0, 8).map((g) => (
                <BarRow key={g.city} label={g.city} value={g.jobs} max={maxJobs} suffix={`${g.applications} apps`} />
              ))
            )}
          </div>
        </Panel>

        <DataTable
          headers={["City", "Jobs", "Applications", "Hospitals", "Professionals"]}
          rows={geography.map((g) => [
            g.city,
            g.jobs,
            g.applications,
            g.activeHospitals,
            g.activeProfessionals,
          ])}
        />

        <Panel title="Applications by city">
          <div className="space-y-3">
            {[...geography]
              .sort((a, b) => b.applications - a.applications)
              .slice(0, 5)
              .map((g) => (
                <BarRow
                  key={`apps-${g.city}`}
                  label={g.city}
                  value={g.applications}
                  max={maxApps}
                  suffix={`${g.jobs} jobs`}
                />
              ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
