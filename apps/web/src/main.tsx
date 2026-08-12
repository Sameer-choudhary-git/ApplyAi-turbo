import React from "react";
import ReactDOM from "react-dom/client";
import {
  initSentryBrowser,
  getSentryDSN,
  getEnvironment,
  isSentryEnabled,
  ErrorBoundary,
} from "@applyai/sentry";
import App from "@/App";
import "@/index.css";

const environment = getEnvironment();
const isProduction = environment === "production";

// Initialize Sentry before React renders so bootstrap and routing failures are captured.
if (isSentryEnabled()) {
  initSentryBrowser({
    dsn: getSentryDSN(),
    environment,
    debug: !isProduction,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    replaysSessionSampleRate: isProduction ? 0.05 : 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  if (!isProduction) {
    console.info(`[Apply AI] Sentry initialized for Web (${environment})`);
  }
} else if (!isProduction) {
  console.info("[Apply AI] Sentry is disabled. Set VITE_ENABLE_SENTRY=true and VITE_SENTRY_DSN to enable it.");
}

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">!</div>
            <h1 className="mt-5 font-heading text-2xl font-extrabold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">We&apos;ve captured the issue and are working on it. Reload to return to your workspace.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">Reload workspace</button>
          </div>
        </div>
      }
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
