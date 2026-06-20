import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { calculateDistance, formatDistance, extractLocality } from "@/lib/distance";
import { hospitalProfilePath } from "@/lib/hospital-types";
import { ChevronRight, Clock, MapPin, Zap } from "lucide-react";

interface JobListItemProps {
  job: any;
  isSelected: boolean;
  onClick: () => void;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

export default function JobListItem({ job, isSelected, onClick, userLocation }: JobListItemProps) {
  const navigate = useNavigate();
  // Calculate distance if user location is available
  const distance = userLocation && job.hospital_profiles?.latitude && job.hospital_profiles?.longitude
    ? calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        job.hospital_profiles.latitude,
        job.hospital_profiles.longitude
      )
    : null;

  // Determine location display text
  const getLocationDisplay = () => {
    if (distance !== null) {
      return formatDistance(distance);
    }
    if (job.hospital_profiles?.address) {
      return extractLocality(job.hospital_profiles.address);
    }
    return job.hospital_profiles?.city || "Location not set";
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "px-4 py-3.5 lg:px-5 lg:py-4 border-b border-border cursor-pointer transition-all duration-200",
        isSelected
          // Desktop: yellow accent fill signals the loaded right panel
          // Mobile: subtle tint only — no yellow, list is full-screen and there is no panel
          ? "bg-primary/5 border-l-4 border-l-primary"
          : "hover:bg-muted/50 border-l-4 border-l-transparent"
      )}
      role="button"
      tabIndex={0}
    >
      {/* Flex wrapper: card content + mobile chevron affordance */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Job Title */}
              <h3 className={cn(
                "text-[15px] lg:text-[17px] font-semibold line-clamp-2 leading-snug",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {job.title}
              </h3>
              {/* Facility */}
              <div className="mt-1 flex items-center gap-2 min-w-0">
                {job.hospital_profiles ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(hospitalProfilePath({
                        slug: job.hospital_profiles.slug,
                        id: job.hospital_profiles.id || job.hospital_id || job.id,
                      }));
                    }}
                    className="text-sm lg:text-base text-primary font-medium truncate hover:underline text-left"
                  >
                    {job.hospital_profiles.hospital_name || "Hospital"}
                  </button>
                ) : (
                  <span className="text-sm lg:text-base text-foreground/80 font-medium truncate">
                    Hospital
                  </span>
                )}
              </div>
            </div>

            {/* Pay (top-right) */}
            <div className="flex-shrink-0 text-right">
              <div className="text-sm lg:text-base font-semibold text-foreground whitespace-nowrap">
                ₹{job.compensation}/hr
              </div>
              <div className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(job.shift_date), "EEE, MMM d")}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm lg:text-[15px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-muted-foreground flex-shrink-0" />
              <span className={cn("truncate", distance !== null ? "text-primary font-medium" : "text-muted-foreground")}>
                {getLocationDisplay()}
              </span>
              {/* Nearby pill for <10km */}
              {distance !== null && distance < 10 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary flex-shrink-0">
                  <Zap className="h-2.5 w-2.5" />
                  Nearby
                </span>
              )}
            </div>
            <span className="text-muted-foreground/60">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {job.shift_start_time.slice(0, 5)} – {job.shift_end_time.slice(0, 5)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile-only chevron — signals that tapping opens a full detail view.
            Hidden on desktop where the split panel makes the affordance obvious. */}
        <ChevronRight className="h-4 w-4 text-muted-foreground/35 flex-shrink-0 lg:hidden" />
      </div>
    </div>
  );
}

