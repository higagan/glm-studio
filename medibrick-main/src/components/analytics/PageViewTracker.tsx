import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { track } from "@/lib/product-analytics";

/** Emit page_view on client-side route changes (Founder Analytics V2). */
export function PageViewTracker() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    track("page_view", { path: location.pathname });
  }, [location.pathname]);

  return null;
}
