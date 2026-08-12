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

// Initialize Sentry FIRST before rendering
if (isSentryEnabled()) {
  initSentryBrowser({
    dsn: getSentryDSN(),
    environment: getEnvironment(),
    debug: process.env.NODE_ENV === "development",
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  });
  console.log(`✅ Sentry initialized for Web (${getEnvironment()})`);
} else {
  console.warn("⚠️  Sentry DSN not configured - error reporting disabled");
}

// Force dark mode globally
document.documentElement.classList.add("dark");

// The '!' tells TypeScript that this element will definitely not be null
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            backgroundColor: "#0f0f0f",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#fff",
          }}
        >
          <div style={{ textAlign: "center", padding: "20px" }}>
            <h1 style={{ fontSize: "24px", marginBottom: "10px" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#aaa", marginBottom: "20px" }}>
              We've been notified about the issue and are looking into it.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
