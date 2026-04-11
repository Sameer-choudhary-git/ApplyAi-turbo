import type { Context, Next } from "hono";
import { createClient } from "@supabase/supabase-js";

// Lazy singleton — only created on first request, after env is loaded
let supabaseAuth: ReturnType<typeof createClient> | null = null;

function getSupabaseAuth() {
  if (!supabaseAuth) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
    }
    supabaseAuth = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return supabaseAuth;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1]!;
  const { data, error } = await getSupabaseAuth().auth.getUser(token);

  if (error || !data.user) {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  c.set("supabaseUser", data.user);
  c.set("userId", data.user.id);

  await next();
}