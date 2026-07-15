import { google } from "googleapis";
import { prisma } from "@applyai/db";
function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getCalendarClient(userId: string) {
  const record = await prisma.user_google_calendar.findUnique({ where: { userId } });
  if (!record) return null;

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: record.accessToken,
    refresh_token: record.refreshToken,
    expiry_date: record.expiryDate.getTime(),
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token && tokens.expiry_date) {
      await prisma.user_google_calendar.update({
        where: { userId },
        data: { accessToken: tokens.access_token, expiryDate: new Date(tokens.expiry_date) },
      });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

interface SyncableEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end?: Date;
  allDay?: boolean;
  durationMinutes?: number; // fallback if no explicit end given
}

type SourceTable = "user_tasks" | "user_interviews" | "user_reminders";

const dateFieldByTable: Record<SourceTable, string> = {
  user_tasks: "dueDate",
  user_interviews: "interviewAt",
  user_reminders: "remindAt",
};

/**
 * Creates or updates a Google Calendar event for a task/interview/reminder.
 * Silently no-ops if the user hasn't connected Google Calendar.
 */
export async function syncEventToGoogle(
  userId: string,
  table: SourceTable,
  event: SyncableEvent,
  existingGoogleEventId?: string | null
) {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return;

  const startTime = event.start;
  const endTime =
    event.end || new Date(startTime.getTime() + (event.durationMinutes || 30) * 60000);

  const requestBody = event.allDay
    ? {
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        start: { date: startTime.toISOString().split("T")[0] },
        end: { date: endTime.toISOString().split("T")[0] },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 24 * 60 }],
        },
      }
    : {
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 },
            { method: "popup", minutes: 24 * 60 },
          ],
        },
      };

  try {
    let googleEventId = existingGoogleEventId;
    if (googleEventId) {
      await calendar.events.update({ calendarId: "primary", eventId: googleEventId, requestBody });
    } else {
      const { data } = await calendar.events.insert({ calendarId: "primary", requestBody });
      googleEventId = data.id!;
    }

    await (prisma[table] as any).update({
      where: { id: event.id },
      data: { googleEventId, syncedToGoogleAt: new Date() },
    });

    return googleEventId;
  } catch (err) {
    console.error(`Google Calendar sync failed for ${table}:${event.id}`, err);
  }
}

/**
 * Deletes the corresponding Google Calendar event, if one exists.
 */
export async function deleteEventFromGoogle(userId: string, googleEventId: string | null) {
  if (!googleEventId) return;
  const calendar = await getCalendarClient(userId);
  if (!calendar) return;

  try {
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
  } catch (err: any) {
    if (err.code !== 404) console.error("Failed to delete Google event:", err);
  }
}