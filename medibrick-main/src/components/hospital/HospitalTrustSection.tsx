import { CheckCircle2, MapPin, Shield, FileCheck } from "lucide-react";
import { HospitalSection } from "@/components/hospital/HospitalSection";
import type { HospitalTrustFlags } from "@/lib/hospital-types";
import { cn } from "@/lib/utils";

function TrustCard({
  title,
  subtitle,
  verified,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  verified: boolean;
  icon: typeof Shield;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        verified ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-border bg-muted/30"
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", verified ? "text-emerald-600" : "text-muted-foreground")} />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          {verified && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1.5 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Verified
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function HospitalTrustSection({ trust }: { trust: HospitalTrustFlags }) {
  const hasAny =
    trust.isVerified ||
    trust.licenseVerified ||
    trust.gstVerified ||
    trust.addressVerified ||
    trust.nabhAccredited;

  if (!hasAny) return null;

  return (
    <HospitalSection title="Trust & verification">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <TrustCard
          title="MediBricks verified"
          subtitle="Facility identity checks"
          verified={trust.isVerified}
          icon={Shield}
        />
        <TrustCard
          title="License verified"
          subtitle="Clinical establishment license"
          verified={trust.licenseVerified}
          icon={FileCheck}
        />
        <TrustCard
          title="NABH accredited"
          subtitle="Quality & patient safety standards"
          verified={trust.nabhAccredited}
          icon={Shield}
        />
        <TrustCard
          title="Address verified"
          subtitle="GPS location & documentation"
          verified={trust.addressVerified}
          icon={MapPin}
        />
        {trust.gstVerified && (
          <TrustCard title="GST verified" subtitle="Business registration" verified icon={FileCheck} />
        )}
      </div>
    </HospitalSection>
  );
}
