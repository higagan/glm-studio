import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";

interface ComplianceStatusCardProps {
  status: "current" | "expiring" | "expired";
  expiryDate?: string;
}

export default function ComplianceStatusCard({ status, expiryDate }: ComplianceStatusCardProps) {
  const statusConfig = {
    current: {
      icon: CheckCircle,
      label: "License Status: Current",
      color: "bg-success text-success-foreground",
      iconColor: "text-success",
    },
    expiring: {
      icon: AlertCircle,
      label: "Action Required: License Expiring Soon",
      color: "bg-yellow-500 text-white",
      iconColor: "text-yellow-500",
    },
    expired: {
      icon: AlertCircle,
      label: "Action Required: Renew License",
      color: "bg-destructive text-destructive-foreground",
      iconColor: "text-destructive",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: config.iconColor }}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
            <div>
              <p className="font-semibold text-foreground">{config.label}</p>
              {expiryDate && (
                <p className="text-sm text-muted-foreground">Valid until: {expiryDate}</p>
              )}
            </div>
          </div>
          <Badge className={config.color}>
            {status === "current" ? "Active" : "Action Needed"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
