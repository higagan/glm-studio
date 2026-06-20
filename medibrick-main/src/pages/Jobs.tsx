import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/product-analytics";
import { Button } from "@/components/ui/button";
import { Briefcase, Search, Filter, LocateFixed, MapPin, Loader2, Zap, X, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { useNavigate, useParams } from "react-router-dom";
import { isLandingSlug } from "@/lib/job-constants";
import JobListItem from "@/components/dashboard/JobListItem";
import JobDetailsView from "@/components/dashboard/JobDetailsView";
import JobFiltersComponent, { JobFilters } from "@/components/dashboard/JobFilters";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { calculateDistance } from "@/lib/distance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PublicJobPost, PUBLIC_JOB_SELECT, PUBLIC_MARKETPLACE_ONLY } from "@/lib/job-types";
import { buildPostAuthReturnUrl, hasPendingApply, resolveReturnPath } from "@/lib/auth-redirect";
import { buildJobDetailSEO, buildJobsListSEO } from "@/lib/job-seo";
import { setSentryUser, captureSupabaseError } from "@/lib/sentry";
import { jobMatchesRoleCategories } from "@/lib/healthcare-roles";

type JobPost = PublicJobPost;

type LocationState = "idle" | "detecting" | "granted" | "denied";

export default function Jobs() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [professionalId, setProfessionalId] = useState<string | undefined>(undefined);
  const [isHospitalAccount, setIsHospitalAccount] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [filters, setFilters] = useState<JobFilters>({
    dateRange: "all",
    shiftTime: "all",
    departments: [],
    specializations: [],
    specialties: [],
    minCompensation: "",
    maxCompensation: "",
    maxDistance: "",
  });

  // Tracks whether the user navigated to a job from within the list (vs arrived
  // directly from a WhatsApp/external link). Determines the back button label.
  const navigatedFromList = useRef(false);

  // Preserve the list's scroll position and filter/search state across the
  // /jobs → /jobs/:slug → /jobs navigation (two separate route instances).
  // State is written to sessionStorage in the job click handler and read on
  // mount of the /jobs route.
  const listScrollRef = useRef<HTMLDivElement>(null);
  const savedScrollPos = useRef(0);
  const pendingScrollRestore = useRef(false);

  useEffect(() => {
    fetchJobs();
    checkAuthAndFetchProfile();
    detectUserLocation();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void checkAuthAndFetchProfile();
      } else if (event === "SIGNED_OUT") {
        setProfessionalId(undefined);
        setIsHospitalAccount(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Safety net: if auth completed on another route but user lands on /jobs list, restore job detail.
  useEffect(() => {
    if (!hasPendingApply()) return;
    const redirect = resolveReturnPath();
    if (!redirect) return;
    const destination = buildPostAuthReturnUrl(redirect);
    const targetPath = destination.split("?")[0];
    if (window.location.pathname === targetPath) return;
    if (slug && (targetPath.endsWith(`/${slug}`) || targetPath.endsWith(`/${slug}/`))) return;
    navigate(destination, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Auto-select first job only when no slug is in the URL.
  // On mobile (<lg) the list is full-screen so we never auto-select — doing so
  // would flash the wrong card yellow when the user taps Back.
  useEffect(() => {
    if (slug) return;
    if (filteredJobs.length === 0) {
      setSelectedJob(null);
    } else if (window.innerWidth >= 1024) {
      // Desktop only: fill the right split panel
      setSelectedJob(filteredJobs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredJobs]);

  // When a slug is in the URL, select the matching job once jobs are loaded.
  // Landing slugs (doctors, nurses, bangalore…) redirect to JobsLanding.
  useEffect(() => {
    if (!slug) return;
    if (isLandingSlug(slug)) {
      navigate(`/jobs/landing/${slug}`, { replace: true });
      return;
    }
    if (jobs.length === 0) return;
    const match = jobs.find((j) => j.slug === slug || j.id === slug);
    if (match) setSelectedJob(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, jobs]);

  const checkAuthAndFetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsHospitalAccount(false);
        return;
      }

      const [{ data: roleRow }, { data: profData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("professional_profiles").select("id").eq("user_id", session.user.id).maybeSingle(),
      ]);

      if (roleRow?.role === "hospital") {
        setIsHospitalAccount(true);
        setProfessionalId(undefined);
        setSentryUser({ id: session.user.id, role: "hospital" });
        return;
      }

      setIsHospitalAccount(false);
      if (profData) {
        setProfessionalId(profData.id);
        setSentryUser({ id: session.user.id, role: "professional", profileId: profData.id });
      }
    } catch (error) {
      console.error("Error fetching professional profile:", error);
    }
  };

  const detectUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocationState("detecting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationState("granted");
      },
      () => {
        setLocationState("denied");
      },
      { timeout: 8000 }
    );
  }, []);

  // Debounced search analytics — fires 1 s after the user stops typing
  useEffect(() => {
    if (!searchTerm) return;
    const timer = setTimeout(() => {
      track("search_performed", { term: searchTerm, resultCount: filteredJobs.length });
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm, filteredJobs.length]);

  // On /jobs (no slug): read saved list state from sessionStorage and restore it.
  // This handles the /jobs/:slug → Back → /jobs round-trip where the component
  // is a fresh mount (two separate routes).
  useEffect(() => {
    if (slug) return;
    const raw = sessionStorage.getItem("mb_jobs_list_state");
    if (!raw) return;
    sessionStorage.removeItem("mb_jobs_list_state"); // consume once
    try {
      const state: { searchTerm?: string; filters?: JobFilters; scrollPos?: number } = JSON.parse(raw);
      if (state.searchTerm !== undefined) setSearchTerm(state.searchTerm);
      if (state.filters) setFilters(state.filters);
      savedScrollPos.current = state.scrollPos ?? 0;
      pendingScrollRestore.current = true;
    } catch { /* ignore corrupt state */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On /jobs/:slug (detail route): restore the fromList flag so the back button
  // shows "All shifts" when the user came from the list.
  useEffect(() => {
    if (!slug) return;
    const raw = sessionStorage.getItem("mb_jobs_list_state");
    if (!raw) return;
    try {
      const state: { fromList?: boolean } = JSON.parse(raw);
      if (state.fromList) navigatedFromList.current = true;
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply saved scroll position after the list finishes rendering.
  // requestAnimationFrame ensures the DOM has updated before setting scrollTop.
  useEffect(() => {
    if (!pendingScrollRestore.current || filteredJobs.length === 0) return;
    pendingScrollRestore.current = false;
    requestAnimationFrame(() => {
      if (listScrollRef.current) {
        listScrollRef.current.scrollTop = savedScrollPos.current;
      }
    });
  }, [filteredJobs]);

  // Sort + filter jobs whenever deps change
  useEffect(() => {
    let filtered = [...jobs];

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(q) ||
          job.department.toLowerCase().includes(q) ||
          job.required_specialization.toLowerCase().includes(q) ||
          (job.specialty && job.specialty.toLowerCase().includes(q)) ||
          job.hospital_profiles.hospital_name.toLowerCase().includes(q) ||
          (job.hospital_profiles.city && job.hospital_profiles.city.toLowerCase().includes(q))
      );
    }

    // Date range
    if (filters.dateRange !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((job) => {
        const jobDate = new Date(job.shift_date);
        jobDate.setHours(0, 0, 0, 0);
        switch (filters.dateRange) {
          case "today": return jobDate.getTime() === today.getTime();
          case "week": {
            const w = new Date(today); w.setDate(w.getDate() + 7);
            return jobDate >= today && jobDate <= w;
          }
          case "month": {
            const m = new Date(today); m.setMonth(m.getMonth() + 1);
            return jobDate >= today && jobDate <= m;
          }
          default: return true;
        }
      });
    }

    // Shift time
    if (filters.shiftTime !== "all") {
      filtered = filtered.filter((job) => {
        const h = parseInt(job.shift_start_time.split(":")[0]);
        switch (filters.shiftTime) {
          case "morning": return h >= 6 && h < 12;
          case "day": return h >= 12 && h < 18;
          case "evening": return h >= 18 && h < 24;
          case "night": return h >= 0 && h < 6;
          default: return true;
        }
      });
    }

    // Departments
    if (filters.departments.length > 0) {
      filtered = filtered.filter((job) => filters.departments.includes(job.department));
    }

    // Role categories
    if (filters.specializations.length > 0) {
      filtered = filtered.filter((job) => jobMatchesRoleCategories(job, filters.specializations));
    }

    // Specialties
    if (filters.specialties.length > 0) {
      filtered = filtered.filter((job) => {
        const spec = job.specialty?.trim();
        if (spec && filters.specialties.includes(spec)) return true;
        return filters.specialties.some((s) => job.title.toLowerCase().includes(s.toLowerCase()));
      });
    }

    // Compensation
    if (filters.minCompensation) {
      filtered = filtered.filter((job) => job.compensation >= parseFloat(filters.minCompensation));
    }
    if (filters.maxCompensation) {
      filtered = filtered.filter((job) => job.compensation <= parseFloat(filters.maxCompensation));
    }

    // Distance filter
    if (filters.maxDistance && userLocation) {
      const maxDist = parseFloat(filters.maxDistance);
      filtered = filtered.filter((job) => {
        if (!job.hospital_profiles.latitude || !job.hospital_profiles.longitude) return false;
        const d = calculateDistance(
          userLocation.latitude, userLocation.longitude,
          job.hospital_profiles.latitude, job.hospital_profiles.longitude
        );
        return d <= maxDist;
      });
    }

    // ✅ Sort by distance if location available, else by date
    if (userLocation) {
      filtered.sort((a, b) => {
        const getDistance = (job: JobPost) => {
          if (!job.hospital_profiles.latitude || !job.hospital_profiles.longitude) return Infinity;
          return calculateDistance(
            userLocation.latitude, userLocation.longitude,
            job.hospital_profiles.latitude, job.hospital_profiles.longitude
          );
        };
        return getDistance(a) - getDistance(b);
      });
    }

    setFilteredJobs(filtered);
  }, [searchTerm, jobs, filters, userLocation]);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange !== "all") count++;
    if (filters.shiftTime !== "all") count++;
    if (filters.departments.length > 0) count++;
    if (filters.specializations.length > 0) count++;
    if (filters.specialties.length > 0) count++;
    if (filters.minCompensation) count++;
    if (filters.maxCompensation) count++;
    if (filters.maxDistance) count++;
    return count;
  };

  const handleFiltersChange = (newFilters: JobFilters) => {
    setFilters(newFilters);
    track("filter_applied", { resultCount: filteredJobs.length });
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: "all",
      shiftTime: "all",
      departments: [],
      specializations: [],
    specialties: [],
      minCompensation: "",
      maxCompensation: "",
      maxDistance: "",
    });
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("job_posts")
        .select(PUBLIC_JOB_SELECT)
        .eq("status", "open")
        .eq("is_seed_data", PUBLIC_MARKETPLACE_ONLY.is_seed_data)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
      setFilteredJobs(data || []);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      captureSupabaseError(
        { message: error?.message || "Unknown error", code: error?.code },
        { fn: "fetchJobs" }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJobApplied = useCallback(() => {
    void checkAuthAndFetchProfile();
  }, []);

  // Derive SEO from selected job when on /jobs/:slug, otherwise generic listing SEO
  const pageSEO = selectedJob && slug
    ? buildJobDetailSEO(selectedJob as PublicJobPost)
    : buildJobsListSEO(jobs.length);

  // On mobile: full-screen detail whenever a job slug is in the URL.
  const showMobileDetail = !!slug && !isLandingSlug(slug);

  // Hide the discovery chrome (hero, search bar, filter chips, job count) on
  // mobile as soon as a slug is in the URL — even before the job finishes
  // loading — so WhatsApp arrivals never see the browsing UI.
  const isDetailRoute = !!slug;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={pageSEO.title}
        description={pageSEO.description}
        path={pageSEO.path}
        ogImage={pageSEO.ogImage}
        jsonLd={pageSEO.jsonLd}
      />
      <Navigation />

      {/* ── Compact status bar (replaces full hero — saves ~80px on mobile) ── */}
      <div className={cn(
        "border-b border-border bg-background",
        isDetailRoute && "max-lg:hidden"
      )}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-2.5 lg:max-w-none lg:px-8 lg:py-3.5 flex items-center gap-2 lg:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2 lg:h-2.5 lg:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 lg:h-2.5 lg:w-2.5 bg-secondary" />
            </span>
            <span className="text-xs lg:text-sm font-semibold text-secondary uppercase tracking-widest">Live</span>
          </div>
          <span className="text-muted-foreground/40 text-xs lg:text-sm">·</span>
          <span className="text-xs lg:text-base font-medium lg:font-semibold text-foreground">Find Healthcare Shifts</span>
        </div>
      </div>

      <main className="w-full">
        {/* ── Search + Quick Chips (sticky) ── */}
        <div className={cn(
          "sticky top-[64px] md:top-[72px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-b border-border",
          isDetailRoute && "max-lg:hidden"
        )}>
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 lg:max-w-none lg:px-8 lg:py-4">
            {/* Search row — centered, prominent */}
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 lg:left-4 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Specialty, hospital, or city…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-9 h-11 lg:pl-11 lg:pr-10 lg:h-12 text-sm lg:text-base bg-muted/40 border-border rounded-xl focus-visible:bg-background"
                  aria-label="Search healthcare shifts"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant={getActiveFilterCount() > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(true)}
                className="h-11 px-4 gap-1.5 flex-shrink-0 lg:h-12 lg:px-5 lg:text-base"
              >
                <Filter className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Filters</span>
                {getActiveFilterCount() > 0 && (
                  <span className="h-4 w-4 flex items-center justify-center text-[10px] rounded-full bg-primary-foreground/25 font-bold">
                    {getActiveFilterCount()}
                  </span>
                )}
              </Button>
            </div>

            {/* Quick filter chips — shift count pinned at left as non-scrolling metadata */}
            <div className="flex items-center gap-1.5 lg:gap-2 mt-2.5 lg:mt-3 overflow-x-auto pb-0.5 no-scrollbar">
              {/* Shift count: replaces the separate list-header row */}
              {!loading && (
                <span className="flex-shrink-0 text-xs lg:text-sm font-medium text-muted-foreground pr-2.5 lg:pr-3 mr-0.5 border-r border-border whitespace-nowrap">
                  {filteredJobs.length} {filteredJobs.length === 1 ? "shift" : "shifts"}
                </span>
              )}
              {(["Today", "This Week"] as const).map((label) => {
                const val = label === "Today" ? "today" : "week";
                const active = filters.dateRange === val;
                return (
                  <button
                    key={label}
                    onClick={() => handleFiltersChange({ ...filters, dateRange: active ? "all" : val as "today" | "week" })}
                    className={cn(
                      "flex-shrink-0 text-xs lg:text-sm font-medium px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border transition-all whitespace-nowrap",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              {(["Morning", "Night"] as const).map((label) => {
                const val = label.toLowerCase() as "morning" | "night";
                const active = filters.shiftTime === val;
                return (
                  <button
                    key={label}
                    onClick={() => handleFiltersChange({ ...filters, shiftTime: active ? "all" : val })}
                    className={cn(
                      "flex-shrink-0 text-xs lg:text-sm font-medium px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border transition-all whitespace-nowrap",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {label === "Morning" ? "🌅 " : "🌙 "}{label}
                  </button>
                );
              })}
              {["Emergency", "ICU", "Surgery", "Pediatrics"].map((dept) => {
                const deptKey = dept === "ICU" ? "Intensive Care Unit (ICU)" : dept;
                const active = filters.departments.includes(deptKey);
                return (
                  <button
                    key={dept}
                    onClick={() => {
                      const updated = active
                        ? filters.departments.filter(d => d !== deptKey)
                        : [...filters.departments, deptKey];
                      handleFiltersChange({ ...filters, departments: updated });
                    }}
                    className={cn(
                      "flex-shrink-0 text-xs lg:text-sm font-medium px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border transition-all whitespace-nowrap",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {dept}
                  </button>
                );
              })}
              {/* Location pill — subtle, end of chip row */}
              {locationState === "idle" && (
                <button
                  onClick={detectUserLocation}
                  className="flex-shrink-0 flex items-center gap-1 text-xs lg:text-sm font-medium px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all whitespace-nowrap"
                >
                  <LocateFixed className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                  Near me
                </button>
              )}
              {locationState === "detecting" && (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs lg:text-sm px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border border-border text-muted-foreground whitespace-nowrap">
                  <Loader2 className="h-3 w-3 lg:h-3.5 lg:w-3.5 animate-spin" />
                  Detecting…
                </span>
              )}
              {locationState === "granted" && (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs lg:text-sm px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border border-secondary/30 bg-secondary/10 text-secondary whitespace-nowrap">
                  <MapPin className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                  Near me
                </span>
              )}
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="flex-shrink-0 flex items-center gap-1 text-xs lg:text-sm font-medium px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all whitespace-nowrap"
                >
                  <X className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">Finding shifts near you…</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            hasFilters={!!(searchTerm || getActiveFilterCount() > 0)}
            onClearSearch={() => setSearchTerm("")}
            onClearFilters={handleResetFilters}
            searchTerm={searchTerm}
            activeFilterCount={getActiveFilterCount()}
            onNavigate={() => navigate("/auth")}
          />
        ) : (
          <div className={cn(
            "flex flex-col lg:flex-row",
            // Mobile detail mode: only nav (64px) sits above — full remaining height.
            // Browse mode: nav (64px) + compact status (~36px) + sticky search (~108px) ≈ 208px.
            isDetailRoute
              ? "max-lg:h-[calc(100vh-64px)] lg:h-[calc(100vh-208px)]"
              : "h-[calc(100vh-208px)]"
          )}>
            {/* Left — Job List
                On mobile: hidden when viewing a job detail route (/jobs/:slug).
                On desktop (lg+): always visible. */}
            <div className={cn(
              "w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 border-r border-border bg-card overflow-hidden flex flex-col",
              showMobileDetail && "max-lg:hidden"
            )}>
            {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto" ref={listScrollRef}>
                {filteredJobs.map((job) => (
                  <JobListItem
                    key={job.id}
                    job={job}
                    isSelected={selectedJob?.id === job.id}
                    onClick={() => {
                      navigatedFromList.current = true;
                      // Snapshot current list state so /jobs can restore it
                      // when the user presses Back from the detail view.
                      sessionStorage.setItem("mb_jobs_list_state", JSON.stringify({
                        searchTerm,
                        filters,
                        scrollPos: listScrollRef.current?.scrollTop ?? 0,
                        fromList: true,
                      }));
                      setSelectedJob(job);
                      if (job.slug) navigate(`/jobs/${job.slug}`);
                    }}
                    userLocation={userLocation}
                  />
                ))}
              </div>
            </div>

            {/* Right — Job Details (desktop only) */}
            <div className="flex-1 bg-background overflow-y-auto hidden lg:block">
              {selectedJob ? (
                <JobDetailsView
                  job={selectedJob}
                  professionalId={professionalId}
                  onUpdate={handleJobApplied}
                  showLoginPrompt={!professionalId && !isHospitalAccount}
                  isHospitalAccount={isHospitalAccount}
                  userLocation={userLocation}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Briefcase className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-muted-foreground/30 mb-4" />
                    <p className="text-base lg:text-lg text-foreground">Select a shift to view details</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile — full-screen detail view (replaces the old 60vh stacked panel) */}
            {showMobileDetail && (
              <div className="lg:hidden flex-1 flex flex-col bg-background overflow-hidden">
                {/* Sticky back button */}
                <div className="flex-shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2">
                  <button
                    onClick={() => {
                      track("back_to_list_clicked", { jobSlug: selectedJob?.slug || selectedJob?.id || slug || "" });
                      navigate("/jobs");
                    }}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {navigatedFromList.current ? "All shifts" : "Find shifts"}
                  </button>
                </div>
                {/* Scrollable detail content */}
                <div className="flex-1 overflow-y-auto">
                  {selectedJob ? (
                    <JobDetailsView
                      job={selectedJob}
                      professionalId={professionalId}
                      onUpdate={handleJobApplied}
                      showLoginPrompt={!professionalId && !isHospitalAccount}
                      isHospitalAccount={isHospitalAccount}
                      userLocation={userLocation}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-32">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Filters Modal ── */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle>Filter Shifts</DialogTitle>
            <DialogDescription>Refine results to find the right shift</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            <JobFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onReset={handleResetFilters}
              userLocation={userLocation}
              activeFilterCount={getActiveFilterCount()}
            />
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
            {getActiveFilterCount() > 0 && (
              <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            )}
            <Button onClick={() => setShowFilters(false)}>Show results</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Empty State Component ──
function EmptyState({
  hasFilters,
  onClearSearch,
  onClearFilters,
  searchTerm,
  activeFilterCount,
  onNavigate,
}: {
  hasFilters: boolean;
  onClearSearch: () => void;
  onClearFilters: () => void;
  searchTerm: string;
  activeFilterCount: number;
  onNavigate: () => void;
}) {
  return (
    <div className="container mx-auto px-4 md:px-6">
      <div className="max-w-lg mx-auto text-center py-24">
        <div className="relative inline-flex mb-6">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
        </div>

        {hasFilters ? (
          <>
            <h3 className="text-xl font-bold text-foreground mb-2">No shifts match your search</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Try broadening your search or adjusting your filters.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              {searchTerm && (
                <Button variant="outline" onClick={onClearSearch}>Clear search</Button>
              )}
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={onClearFilters}>Clear filters</Button>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-foreground mb-2">Shifts are filling up fast</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
              New high-paying, flexible shifts are posted daily. Sign up free to get notified the moment one opens near you.
            </p>

            {/* Trust signals */}
            <div className="flex justify-center gap-6 mb-8 text-xs text-muted-foreground">
              {["Free to join", "No commission", "Instant apply"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary inline-block" />
                  {t}
                </div>
              ))}
            </div>

            <Button size="lg" onClick={onNavigate} className="w-full sm:w-auto shadow-md">
              Get notified — it's free
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
