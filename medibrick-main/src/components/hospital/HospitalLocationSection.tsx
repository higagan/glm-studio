import { ExternalLink, MapPin } from "lucide-react";
import { track } from "@/lib/product-analytics";
import { HospitalSection } from "@/components/hospital/HospitalSection";
import type { PublicHospitalProfile } from "@/lib/hospital-types";

export function HospitalLocationSection({
  hospital,
  hospitalSlug,
}: {
  hospital: PublicHospitalProfile;
  hospitalSlug: string;
}) {
  const locationParts = [hospital.city, hospital.state].filter(Boolean).join(", ");
  const mapsUrl =
    hospital.latitude && hospital.longitude
      ? `https://maps.google.com/?q=${hospital.latitude},${hospital.longitude}`
      : hospital.address
        ? `https://maps.google.com/?q=${encodeURIComponent(hospital.address)}`
        : null;

  if (!hospital.address && !mapsUrl) return null;

  const trackMaps = () => track("maps_opened", { hospitalSlug });

  return (
    <HospitalSection title="Location">
      {hospital.address && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex items-start gap-2">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {hospital.address}
            {locationParts && `, ${locationParts}`}
          </span>
        </p>
      )}
      {hospital.latitude && hospital.longitude && (
        <div className="rounded-lg overflow-hidden border border-border aspect-[2/1] bg-muted mb-3">
          <iframe
            title={`Map of ${hospital.hospital_name}`}
            src={`https://maps.google.com/maps?q=${hospital.latitude},${hospital.longitude}&z=14&output=embed`}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackMaps}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
        >
          Open in Google Maps
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </HospitalSection>
  );
}
