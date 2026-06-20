import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { savePostShiftIntent } from "@/lib/auth-redirect";
import HospitalDashboard from "@/components/dashboard/HospitalDashboard";
import ProfessionalDashboard from "@/components/dashboard/ProfessionalDashboard";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        if (searchParams.get("action") === "post-shift") {
          savePostShiftIntent();
        }
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchUserRole(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      if (event === "SIGNED_IN") {
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserRole = async (userId: string) => {
    try {
      // Check if profile is complete
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      
      // If profile is incomplete (no full_name or no role), redirect to complete profile
      if (!profile || !profile.full_name || !data) {
        navigate("/complete-profile");
        return;
      }
      
      setUserRole(data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
      navigate("/complete-profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {userRole === "hospital" ? (
        <HospitalDashboard user={user} />
      ) : (
        <ProfessionalDashboard user={user} />
      )}
    </div>
  );
}
