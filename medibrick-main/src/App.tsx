import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import HospitalSettings from "./pages/HospitalSettings";
import MinimalProfileDetails from "./pages/MinimalProfileDetails";
import Jobs from "./pages/Jobs";
import ProfessionalProfile from "./pages/ProfessionalProfile";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import NearbyJobs from "./pages/NearbyJobs";
import HospitalProfile from "./pages/HospitalProfile";
import ResetPassword from "./pages/ResetPassword";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import BlogList from "./pages/admin/BlogList";
import BlogEditor from "./pages/admin/BlogEditor";
import { AnalyticsShell } from "./pages/admin/analytics/AnalyticsShell";
import { PageViewTracker } from "./components/analytics/PageViewTracker";
import NotFound from "./pages/NotFound";
import ForHospitals from "./pages/ForHospitals";
import ForProfessionals from "./pages/ForProfessionals";
import HowItWorks from "./pages/HowItWorks";
import VerificationProcess from "./pages/VerificationProcess";
import JobsLanding from "./pages/JobsLanding";
import NavigationReview from "./pages/dev/NavigationReview";
import LogoComparison from "./pages/dev/LogoComparison";

const queryClient = new QueryClient();

function FacilityRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/hospitals/${slug}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageViewTracker />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/settings" element={<HospitalSettings />} />
          <Route path="/select-role" element={<Navigate to="/complete-profile" replace />} />
          <Route path="/complete-profile" element={<MinimalProfileDetails />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/landing/:segment" element={<JobsLanding />} />
          <Route path="/jobs/:slug" element={<Jobs />} />
          <Route path="/profile" element={<ProfessionalProfile />} />
          <Route path="/profile/:id" element={<ProfessionalProfile />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Navigate to="/admin/analytics/actions" replace />} />
          <Route path="/admin/metrics" element={<Navigate to="/admin/analytics/actions" replace />} />
          <Route path="/admin/manage" element={<Admin />} />
          <Route path="/admin/analytics/*" element={<AnalyticsShell />} />
          <Route path="/nearby" element={<NearbyJobs />} />
          <Route path="/hospitals/:slug" element={<HospitalProfile />} />
          <Route path="/facility/:slug" element={<FacilityRedirect />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/admin/blog" element={<BlogList />} />
          <Route path="/admin/blog/edit/:id" element={<BlogEditor />} />
          <Route path="/for-hospitals" element={<ForHospitals />} />
          <Route path="/for-professionals" element={<ForProfessionals />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/verification-process" element={<VerificationProcess />} />
          {import.meta.env.DEV ? (
            <>
              <Route path="/dev/navigation-review" element={<NavigationReview />} />
              <Route path="/dev/logo-comparison" element={<LogoComparison />} />
            </>
          ) : null}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
