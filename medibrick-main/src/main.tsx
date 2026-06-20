import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import * as Sentry from "@sentry/react";
import { initSentry } from "@/lib/sentry";
import { AppErrorFallback } from "@/components/AppErrorFallback";
import App from "./App.tsx";
import "./index.css";

initSentry();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={({ error }) => <AppErrorFallback error={error as Error} />}>
    <HelmetProvider>
      <Analytics />
      <SpeedInsights />
      <App />
    </HelmetProvider>
  </Sentry.ErrorBoundary>
);
