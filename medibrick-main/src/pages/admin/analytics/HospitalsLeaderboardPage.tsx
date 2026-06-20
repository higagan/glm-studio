import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/admin/founder/FounderSections";
import type { HospitalLeaderboardRow, HospitalLeaderboardsPayload } from "@/lib/founder-analytics-types";
import { PeriodSelect, useAnalyticsFetch } from "./AnalyticsShell";
import { TabPageHeader } from "./TabChrome";

function HospitalNameCell({ row }: { row: HospitalLeaderboardRow }) {
  if (row.slug && row.slug !== "unknown") {
    return (
      <Link to={`/hospitals/${row.slug}`} className="font-medium text-primary hover:underline">
        {row.name}
      </Link>
    );
  }
  return <span className="font-medium">{row.name}</span>;
}

function SimpleLeaderboardTable({
  rows,
  emptyMessage,
  children,
}: {
  rows: HospitalLeaderboardRow[];
  emptyMessage: string;
  children: (row: HospitalLeaderboardRow) => React.ReactNode;
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.slug}-${row.name}`} className="border-b last:border-0">
              {children(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HospitalsLeaderboardPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error, refresh } = useAnalyticsFetch<HospitalLeaderboardsPayload>(
    "hospital_leaderboards",
    days,
  );

  return (
    <div className="space-y-8">
      <TabPageHeader title="Hospital Leaderboards" question="Which hospitals earn discovery and trust?">
        <PeriodSelect days={days} onChange={setDays} />
        <Button variant="outline" size="icon" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </TabPageHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <p className="text-xs text-muted-foreground">Last {data.periodDays} days of profile engagement</p>

          <Section id="most-viewed" title="Most viewed profiles" subtitle="Unique sessions on hospital profile pages">
            <SimpleLeaderboardTable
              rows={data.mostViewed}
              emptyMessage="No profile views yet — traffic will appear as doctors discover hospitals."
            >
              {(row) => (
                <>
                  <td className="px-4 py-3">
                    <HospitalNameCell row={row} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.views ?? "—"}</td>
                </>
              )}
            </SimpleLeaderboardTable>
          </Section>

          <Section id="best-rated" title="Best rated" subtitle="Hospitals with verified shift reviews">
            <SimpleLeaderboardTable
              rows={data.bestRated}
              emptyMessage="No reviews yet — ratings appear after completed shifts."
            >
              {(row) => (
                <>
                  <td className="px-4 py-3">
                    <HospitalNameCell row={row} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.rating ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.review_count ?? "—"}</td>
                </>
              )}
            </SimpleLeaderboardTable>
          </Section>

          <Section
            id="highest-conversion"
            title="Highest profile → apply conversion"
            subtitle="Applies started from hospital profile open shifts"
          >
            <SimpleLeaderboardTable
              rows={data.highestConversion}
              emptyMessage="Not enough data — needs profile views and apply clicks."
            >
              {(row) => (
                <>
                  <td className="px-4 py-3">
                    <HospitalNameCell row={row} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.views ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.applies ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.conversion_pct != null ? `${row.conversion_pct}%` : "—"}
                  </td>
                </>
              )}
            </SimpleLeaderboardTable>
          </Section>

          <Section
            id="highest-repeat"
            title="Highest repeat professionals"
            subtitle="Share of doctors who worked 2+ accepted shifts"
          >
            <SimpleLeaderboardTable
              rows={data.highestRepeat}
              emptyMessage="No repeat professionals yet."
            >
              {(row) => (
                <>
                  <td className="px-4 py-3">
                    <HospitalNameCell row={row} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.repeat_rate != null ? `${row.repeat_rate}%` : "—"}
                  </td>
                </>
              )}
            </SimpleLeaderboardTable>
          </Section>
        </>
      ) : null}
    </div>
  );
}
