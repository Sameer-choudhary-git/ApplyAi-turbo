import { api } from "@/lib/api";
import { supabase } from "@/supabaseClient";
import { getApiUrl } from "@applyai/config";

export interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
}

export function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  return api<GoogleCalendarStatus>("/google-calendar/status");
}

export function disconnectGoogleCalendar(): Promise<{ success: boolean }> {
  return api("/google-calendar", { method: "DELETE" });
}

// now async — needs to read the current session token before building the URL
export async function connectGoogleCalendarUrl(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  return `${getApiUrl("/api/google-calendar/connect")}?token=${encodeURIComponent(token || "")}`;
}
