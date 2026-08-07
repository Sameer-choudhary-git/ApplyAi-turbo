import { supabase } from "@/supabaseClient";
import { apiConfig, getApiUrl } from "@applyai/config";

if (!apiConfig.baseUrl) {
  throw new Error(
    "Missing VITE_API_URL. Add it to apps/web/.env.local or your Vercel environment variables.",
  );
}

const API = getApiUrl("/api");

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    Authorization: `Bearer ${session?.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(await authHeaders()),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
