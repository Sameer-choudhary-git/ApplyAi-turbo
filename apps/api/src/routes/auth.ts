import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { prisma } from "@applyai/db";


export const authRoutes = new Hono();




// Called after Supabase login on the frontend.
// Creates the user row in our DB if it doesn't exist yet.
// /api/auth/sync
authRoutes.post("/sync", authMiddleware, async (c) => {
  const supabaseUser = c.get("supabaseUser");

  const user = await prisma.users.upsert({
    where: { email: supabaseUser.email! },
    update: { updatedAt: new Date() },
    create: {
      id: supabaseUser.id,         // use same ID as Supabase
      email: supabaseUser.email!,
      fullName:
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.email!.split("@")[0],
    },
  });

  return c.json({ success: true, user });
});


authRoutes.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId") as string;

  const user = await prisma.users.findUnique({
    where: { id: userId },

  });

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  return c.json({ success: true, user });
});