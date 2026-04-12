/**
 * src/hooks/useUnstopSetup.ts
 *
 * Manages the full setup flow from the web UI side:
 *   1. POST /request-setup → get { token, deepLink }
 *   2. Open deepLink (engibuddy://?token=...) → triggers Electron app on user's machine
 *   3. Poll GET /status every 3s until success | expired
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { apiConfig } from "@applyai/config";
import { supabase } from "@/supabaseClient";

export type SetupStatus =
  | "idle"
  | "requesting"
  | "pending"
  | "success"
  | "expired"
  | "error";

interface SetupState {
  status: SetupStatus;
  error: string | null;
  deepLink: string | null;  // was: scriptCommand
  token: string | null;
}

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 11 * 60 * 1000; // 11 min (token lives 10 min)

export function useUnstopSetup(onSuccess?: () => void) {
  const [state, setState] = useState<SetupState>({
    status: "idle",
    error: null,
    deepLink: null,
    token: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback(() => {
    pollStartRef.current = Date.now();

    pollRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        setState((s) => ({
          ...s,
          status: "expired",
          error: "Token expired. Please start again.",
        }));
        return;
      }

      try {
        const tsession = await supabase.auth.getSession();
        const ttoken = tsession.data.session?.access_token;

        const res = await fetch(
          `${apiConfig.baseUrl}${apiConfig.endpoints.unstop.status}`,
          {
            credentials: "include",
            headers: ttoken ? { Authorization: `Bearer ${ttoken}` } : {},
          },
        );

        const data: { status: string; error?: string } = await res.json();

        if (data.status === "success") {
          stopPolling();
          setState((s) => ({ ...s, status: "success" }));
          toast.success("Unstop session connected!");
          onSuccess?.();
        } else if (data.status === "expired") {
          stopPolling();
          setState((s) => ({
            ...s,
            status: "expired",
            error: "Token expired. Please start again.",
          }));
        }
        // 'pending' → keep polling
      } catch {
        // network blip — keep polling
      }
    }, POLL_MS);
  }, [stopPolling, onSuccess]);

  const startSetup = useCallback(async () => {
    stopPolling();
    setState({
      status: "requesting",
      error: null,
      deepLink: null,
      token: null,
    });

    try {
      const tsession = await supabase.auth.getSession();
      const ttoken = tsession.data.session?.access_token;
      if (!ttoken) throw new Error("Not authenticated");

      const res = await fetch(
        `${apiConfig.baseUrl}${apiConfig.endpoints.unstop.requestSetup}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ttoken}`,
          },
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "Failed to start setup");
      }

      const { token, deepLink } = await res.json();

      setState({ status: "pending", error: null, deepLink, token });

      // Trigger the Electron app on the user's machine
      window.location.href = deepLink;

      startPolling();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setState({
        status: "error",
        error: msg,
        deepLink: null,
        token: null,
      });
      toast.error(msg);
    }
  }, [stopPolling, startPolling]);

  const doesCookiesExst = (platform: string) : boolean => {
    
    return false;
  };

  const reset = useCallback(() => {
    stopPolling();
    setState({ status: "idle", error: null, deepLink: null, token: null });
  }, [stopPolling]);

  return { ...state, startSetup, reset };
}