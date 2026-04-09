import type { Context, Next } from "hono";
import { createClient } from "@supabase/supabase-js";

// Creates a per-request Supabase client using the user's JWT
// so RLS policies in Supabase apply automatically
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  // Verify token with Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  // Attach user to context for downstream handlers
  c.set("supabaseUser", data.user);
  c.set("userId", data.user.id);

  await next();
}