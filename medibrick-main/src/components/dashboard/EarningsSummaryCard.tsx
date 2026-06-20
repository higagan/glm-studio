import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";

interface EarningsSummaryCardProps {
  upcomingPayouts: number;
  totalEarnedYTD: number;
}

export default function EarningsSummaryCard({ upcomingPayouts, totalEarnedYTD }: EarningsSummaryCardProps) {
  return (
    <Card className="bg-secondary/10 border-secondary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-secondary" />
          Earnings Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Upcoming Payouts</p>
            <p className="text-2xl font-bold text-secondary">₹{upcomingPayouts.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Total Earned (YTD)
              <TrendingUp className="h-3 w-3" />
            </p>
            <p className="text-2xl font-bold text-foreground">₹{totalEarnedYTD.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
