import { supabase } from "@/supabaseClient";

const API = "http://localhost:3000/api";

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