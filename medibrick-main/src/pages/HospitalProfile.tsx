import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { track } from "@/lib/product-analytics";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import ShareHospitalButton from "@/components/ShareHospitalButton";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HospitalProfileHero } from "@/components/hospital/HospitalProfileHero";
import { HospitalTrustSection } from "@/components/hospital/HospitalTrustSection";
import { HospitalAboutSection } from "@/components/hospital/HospitalAboutSection";
import { HospitalReviewsSection } from "@/components/hospital/HospitalReviewsSection";
import { HospitalWorkingExperience } from "@/components/hospital/HospitalWorkingExperience";
import { HospitalOpenShifts } from "@/components/hospital/HospitalOpenShifts";
import { HospitalHiringActivitySection } from "@/components/hospital/HospitalHiringActivity";
import { HospitalLocationSection } from "@/components/hospital/HospitalLocationSection";
import { HospitalProfileSidebar } from "@/components/hospital/HospitalProfileSidebar";
import { HospitalFollowButton } from "@/components/hospital/HospitalFollowButton";
import { HospitalSection } from "@/components/hospital/HospitalSection";
import { buildHospitalSEO, getHospitalFaqItems } from "@/lib/hospital-seo";
import {
  type HospitalPublicProfilePayload,
  parseHospitalProfilePayload,
} from "@/lib/hospital-types";
import { ArrowLeft, Building2 } from "lucide-react";

export default function HospitalProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<HospitalPublicProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async (hospitalSlug: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const { data: raw, error } = await supabase.rpc("get_hospital_public_profile", {
        p_slug: hospitalSlug,
      });
      if (error) throw error;
      if (!raw) {
        setNotFound(true);
        return;
      }
      const payload = parseHospitalProfilePayload(raw as Record<string, unknown>);
      setData(payload);

      const pageSlug = payload.profile.slug || payload.profile.id;
      track("hospital_profile_viewed", {
        hospitalSlug: pageSlug,
        hospitalName: payload.profile.hospital_name,
        openJobs: payload.stats.openJobs,
      });
    } catch (err) {
      console.error("Hospital profile load error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slug) void load(slug);
  }, [slug, load]);

  const scrollToShifts = () => {
    document.getElementById("open-shifts")?.scrollIntoView({ behavior: "smooth" });
    track("hospital_view_shifts_clicked", { hospitalSlug: slug || "" });
    track("hospital_jobs_viewed", { hospitalSlug: slug || "" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-primary/20 border-t-primary" />
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Building2 className="h-11 w-11 text-muted-foreground/35 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">This hospital profile isn’t available</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The link may be outdated. You can still explore open shifts from verified facilities near you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => navigate("/jobs")}>Browse open shifts</Button>
            <Button variant="outline" onClick={() => navigate("/")}>Go to homepage</Button>
          </div>
        </div>
      </div>
    );
  }

  const { profile: hospital, stats, trust, reviews, reviewSummary, hiringActivity, openJobs, isFollowing } = data;
  const pageSlug = hospital.slug || hospital.id;
  const seo = buildHospitalSEO(hospital, stats, reviews);
  const faqItems = getHospitalFaqItems(hospital.hospital_name);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-10">
      <SEO title={seo.title} description={seo.description} path={seo.path} ogImage={seo.ogImage} jsonLd={seo.jsonLd} />
      <Navigation />

      <div className="max-w-5xl mx-auto">
        <div className="px-4 lg:px-8 pt-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1 py-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="hidden sm:flex gap-2">
            <HospitalFollowButton
              hospitalId={hospital.id}
              hospitalSlug={pageSlug}
              isFollowing={isFollowing}
              onFollowingChange={(f) => setData((d) => (d ? { ...d, isFollowing: f } : d))}
              variant="ghost"
            />
            <ShareHospitalButton
              hospitalName={hospital.hospital_name}
              slug={pageSlug}
              city={hospital.city}
              variant="ghost"
              buttonSize="sm"
            />
          </div>
        </div>

        <HospitalProfileHero
          hospital={hospital}
          stats={stats}
          pageSlug={pageSlug}
          onViewShifts={scrollToShifts}
          followControl={
            <HospitalFollowButton
              hospitalId={hospital.id}
              hospitalSlug={pageSlug}
              isFollowing={isFollowing}
              onFollowingChange={(f) => setData((d) => (d ? { ...d, isFollowing: f } : d))}
              variant="outline"
            />
          }
        />

        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-0 lg:items-start">
          <div className="min-w-0">
            <HospitalTrustSection trust={trust} />
            <HospitalAboutSection hospital={hospital} />
            <HospitalReviewsSection
              reviews={reviews}
              summary={reviewSummary}
              hospitalSlug={pageSlug}
              averageRating={stats.averageRating}
            />
            <HospitalWorkingExperience stats={stats} />
            <HospitalOpenShifts jobs={openJobs} hospitalSlug={pageSlug} />
            <HospitalHiringActivitySection activity={hiringActivity} />
            <HospitalLocationSection hospital={hospital} hospitalSlug={pageSlug} />
            <HospitalSection title="FAQ" className="border-b-0">
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-border/60">
                    <AccordionTrigger className="text-sm text-left py-3 hover:no-underline">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-3">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </HospitalSection>
          </div>

          <div className="px-4 lg:px-6 pb-8">
            <HospitalProfileSidebar
              hospital={hospital}
              stats={stats}
              pageSlug={pageSlug}
              isFollowing={isFollowing}
              onViewShifts={scrollToShifts}
              onFollowingChange={(f) => setData((d) => (d ? { ...d, isFollowing: f } : d))}
            />
          </div>
        </div>
      </div>

      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur px-4 py-2.5">
        <div className="flex gap-2 max-w-5xl mx-auto">
          <Button onClick={scrollToShifts} className="flex-1 h-11 font-semibold rounded-xl">
            {stats.openJobs > 0 ? `View ${stats.openJobs} shift${stats.openJobs === 1 ? "" : "s"}` : "View shifts"}
          </Button>
          <ShareHospitalButton
            hospitalName={hospital.hospital_name}
            slug={pageSlug}
            city={hospital.city}
            variant="outline"
          />
        </div>
      </div>
    </div>
  );
}
