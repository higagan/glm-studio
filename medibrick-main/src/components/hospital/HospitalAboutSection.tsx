import { Award } from "lucide-react";
import { HospitalSection } from "@/components/hospital/HospitalSection";
import type { PublicHospitalProfile } from "@/lib/hospital-types";

export function HospitalAboutSection({ hospital }: { hospital: PublicHospitalProfile }) {
  const hasAbout =
    hospital.description ||
    hospital.mission ||
    hospital.specialties.length > 0 ||
    hospital.departments.length > 0 ||
    hospital.certifications.length > 0 ||
    hospital.awards.length > 0;

  if (!hasAbout) return null;

  return (
    <HospitalSection title="About">
      {hospital.description && (
        <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">{hospital.description}</p>
      )}
      {hospital.mission && (
        <p className="text-sm lg:text-base text-foreground/80 leading-relaxed mt-3 italic">{hospital.mission}</p>
      )}
      {(hospital.specialties.length > 0 || hospital.departments.length > 0) && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Specialties & departments
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...hospital.specialties, ...hospital.departments].map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-md bg-muted/60 px-2 py-0.5 lg:px-2.5 lg:py-1 text-xs lg:text-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      {hospital.certifications.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Accreditation</p>
          <div className="flex flex-wrap gap-1.5">
            {hospital.certifications.map((cert) => (
              <span key={cert} className="text-xs lg:text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}
      {hospital.awards.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {hospital.awards.map((award) => (
            <li key={award} className="text-sm text-muted-foreground flex items-start gap-2">
              <Award className="h-3.5 w-3.5 text-primary/60 mt-0.5 shrink-0" />
              {award}
            </li>
          ))}
        </ul>
      )}
    </HospitalSection>
  );
}
