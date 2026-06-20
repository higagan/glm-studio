import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  clearFounderGateToken,
  getFounderGateToken,
  verifyFounderGateToken,
} from "@/lib/founder-gate";

/** Simple password gate for /admin founder pages (no Supabase login). */
export function useAdminGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const token = getFounderGateToken();
      if (!token) {
        if (!cancelled) {
          const from = location.pathname + location.search;
          navigate(`/admin/login?from=${encodeURIComponent(from)}`, { replace: true });
          setLoading(false);
        }
        return;
      }

      const valid = await verifyFounderGateToken();
      if (cancelled) return;

      if (!valid) {
        clearFounderGateToken();
        const from = location.pathname + location.search;
        navigate(`/admin/login?from=${encodeURIComponent(from)}`, { replace: true });
        setLoading(false);
        return;
      }

      setIsAuthed(true);
      setLoading(false);
    }

    check();
    return () => { cancelled = true; };
  }, [navigate, location.pathname, location.search]);

  function logout() {
    clearFounderGateToken();
    navigate("/admin/login", { replace: true });
  }

  return { loading, isAuthed, token: getFounderGateToken(), logout };
}
