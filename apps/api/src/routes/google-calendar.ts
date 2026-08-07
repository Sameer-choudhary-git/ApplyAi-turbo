import { Hono } from "hono";
import { google } from "googleapis";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "@applyai/db";
import { supabaseAdmin } from "../lib/supabase";

const googleCalendar = new Hono();

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

// GET /api/google-calendar/connect?token=<supabase_access_token>
// NOTE: intentionally NOT behind authMiddleware — this is a full browser
// redirect (to Google's consent screen), so it can't carry an Authorization header.
// We verify the token manually from the query string instead.
googleCalendar.get("/connect", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.redirect(`${process.env.FRONTEND_URL}/preferences?calendar=error`);
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) {
    return c.redirect(`${process.env.FRONTEND_URL}/preferences?calendar=error`);
  }

  const userId = userData.user.id;
  const oauth2Client = getOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state: userId,
  });

  return c.redirect(url);
});

// GET /api/google-calendar/callback — Google redirects here after consent
googleCalendar.get("/callback", async (c) => {
  const code = c.req.query("code");
  const userId = c.req.query("state");

  if (!code || !userId) {
    return c.redirect(`${process.env.FRONTEND_URL}/preferences?calendar=error`);
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      console.error("Incomplete token response from Google:", tokens);
      return c.redirect(
        `${process.env.FRONTEND_URL}/preferences?calendar=error`,
      );
    }

    oauth2Client.setCredentials(tokens);

    // Use the client's own .request() instead of the google.oauth2() wrapper —
    // this guarantees the Authorization header is attached correctly.
    const { data: profile } = await oauth2Client.request<{ email?: string }>({
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
    });

    await prisma.user_google_calendar.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: new Date(tokens.expiry_date),
        email: profile.email || null,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: new Date(tokens.expiry_date),
        email: profile.email || null,
      },
    });

    return c.redirect(
      `${process.env.FRONTEND_URL}/preferences?calendar=connected`,
    );
  } catch (err) {
    console.error("Google Calendar OAuth callback error:", err);
    return c.redirect(`${process.env.FRONTEND_URL}/preferences?calendar=error`);
  }
});

// GET /api/google-calendar/status — is this user connected?
googleCalendar.get("/status", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const record = await prisma.user_google_calendar.findUnique({
    where: { userId },
  });

  return c.json({
    connected: !!record,
    email: record?.email || null,
  });
});

// DELETE /api/google-calendar — disconnect
googleCalendar.delete("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const record = await prisma.user_google_calendar.findUnique({
    where: { userId },
  });

  if (record) {
    try {
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({ refresh_token: record.refreshToken });
      await oauth2Client.revokeCredentials(); // best-effort revoke on Google's side
    } catch (err) {
      console.error("Failed to revoke Google token (continuing anyway):", err);
    }

    await prisma.user_google_calendar.delete({ where: { userId } });
  }

  return c.json({ success: true });
});

export default googleCalendar;
