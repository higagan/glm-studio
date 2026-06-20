import { useEffect } from "react";
import { track } from "@/lib/product-analytics";

interface AppErrorFallbackProps {
  error?: Error;
}

export function AppErrorFallback({ error }: AppErrorFallbackProps) {
  useEffect(() => {
    track("error_boundary_triggered", {
      path: window.location.pathname,
      errorMessage: error?.message || "Unknown error",
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl select-none">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          We ran into an unexpected error. Refreshing the page usually fixes this.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
