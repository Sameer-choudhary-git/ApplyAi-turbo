/**
 * components/UnstopCookieSetup.tsx
 *
 * Handles the Unstop session cookie setup flow UI.
 * Works for both Electron (desktop app) and web browser contexts.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Cookie,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MonitorDown,
} from "lucide-react";
import { useUnstopSetup } from "@/hooks/useUnstopSetup";

interface UnstopCookieSetupProps {
  sessionActive: boolean;
  onSuccess: () => void;
}

export function UnstopCookieSetup({
  sessionActive,
  onSuccess,
}: UnstopCookieSetupProps) {
  const { status, error, deepLink, isElectron, startSetup, reset } =
    useUnstopSetup(onSuccess);

  // ── Success ──────────────────────────────────────────────────────────────
  if (status === "success" || sessionActive) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        Session active
        <button
          className="ml-auto text-xs text-emerald-400/60 hover:text-emerald-300 underline underline-offset-2 transition-colors"
          onClick={reset}
        >
          refresh
        </button>
      </div>
    );
  }

  // ── In-progress ───────────────────────────────────────────────────────────
  const progressStates: Record<string, { label: string; color: string }> = {
    requesting: { label: "Requesting token…", color: "text-muted-foreground" },
    launching: { label: "Launching browser…", color: "text-blue-400" },
    waiting: { label: "Waiting for login…", color: "text-blue-400" },
    saving: { label: "Saving session…", color: "text-amber-400" },
  };

  if (progressStates[status]) {
    const { label, color } = progressStates[status];
    return (
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-medium ${color} animate-pulse`}
      >
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        {label}
      </div>
    );
  }

  // ── Pending deep-link ─────────────────────────────────────────────────────
  if (status === "pending" && deepLink) {
    return (
      <div className="space-y-3 w-full">
        {isElectron ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            Browser opening… waiting for login
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
            <div className="flex items-start gap-2">
              <MonitorDown className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Open EngiBuddy Desktop
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click the button below to launch the desktop app. It will open
                  a browser for you to log in to Unstop.
                </p>
              </div>
            </div>
            <a href={deepLink} className="block">
              <Button
                className="w-full gap-2 bg-blue-500 hover:bg-blue-600 text-white border-0"
                size="sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open in EngiBuddy App
              </Button>
            </a>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Loader2 className="w-3 h-3 animate-spin" />
              Waiting for desktop app to complete login…
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Idle / Error ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="outline"
        className="gap-2 text-sm border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/70 transition-all"
        onClick={startSetup}
      >
        <Cookie className="w-4 h-4" />
        {sessionActive ? "Update Unstop Cookies" : "Setup Unstop Cookies"}
      </Button>
      {status === "error" && error && (
        <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
