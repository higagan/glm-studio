import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { track } from "@/lib/product-analytics";
import { HospitalSection, HospitalStarRating } from "@/components/hospital/HospitalSection";
import type { HospitalReview, HospitalReviewSummary } from "@/lib/hospital-types";

function DimensionBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums font-medium">{value.toFixed(1)}</span>
    </div>
  );
}

function ReviewCard({
  review,
  hospitalSlug,
}: {
  review: HospitalReview;
  hospitalSlug: string;
}) {
  const ref = useRef<HTMLQuoteElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || tracked.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !tracked.current) {
          tracked.current = true;
          track("hospital_review_read", { hospitalSlug, reviewId: review.id });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hospitalSlug, review.id]);

  return (
    <blockquote ref={ref} className="border-l-2 border-primary/20 pl-3.5 lg:pl-4">
      <HospitalStarRating rating={review.rating} />
      <p className="text-sm lg:text-base text-foreground mt-1.5 leading-relaxed">{review.review_text}</p>
      <footer className="text-xs lg:text-sm text-muted-foreground mt-1.5">
        {review.role_title}
        {review.specialty && ` · ${review.specialty}`}
        {review.would_work_again != null && ` · Would work again: ${review.would_work_again ? "Yes" : "No"}`}
        {review.shift_completed_date &&
          ` · ${format(new Date(review.shift_completed_date + "T00:00:00"), "MMM yyyy")}`}
      </footer>
    </blockquote>
  );
}

export function HospitalReviewsSection({
  reviews,
  summary,
  hospitalSlug,
  averageRating,
}: {
  reviews: HospitalReview[];
  summary: HospitalReviewSummary;
  hospitalSlug: string;
  averageRating: number | null;
}) {
  if (reviews.length === 0) return null;

  return (
    <HospitalSection
      title="Professional reviews"
      action={
        averageRating != null ? (
          <span className="text-sm font-semibold tabular-nums">{averageRating.toFixed(1)} ★</span>
        ) : undefined
      }
    >
      <div className="space-y-3 mb-5">
        <DimensionBar label="Payment" value={summary.paymentAvg} />
        <DimensionBar label="Management" value={summary.managementAvg} />
        <DimensionBar label="Environment" value={summary.environmentAvg} />
        <DimensionBar label="Shift org" value={summary.shiftOrgAvg} />
        {summary.wouldWorkAgainPct != null && (
          <p className="text-xs text-muted-foreground">
            {summary.wouldWorkAgainPct}% would work here again
          </p>
        )}
      </div>
      <div className="space-y-4 lg:space-y-5">
        {reviews.slice(0, 8).map((review) => (
          <ReviewCard key={review.id} review={review} hospitalSlug={hospitalSlug} />
        ))}
      </div>
    </HospitalSection>
  );
}
