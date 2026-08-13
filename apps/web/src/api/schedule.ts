import { api } from "@/lib/api";

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  remindAt: string;
  endAt: string | null;
  allDay: boolean;
  sourceType: string | null;
  sourceId: string | null;
  status: string;
}

export interface ReminderInput {
  title: string;
  description?: string;
  location?: string;
  remindAt: string;
  endAt?: string;
  allDay?: boolean;
  sourceType?: string;
  sourceId?: string;
}

export function createReminder(input: ReminderInput): Promise<{ success: boolean; data: Reminder }> {
  return api("/schedule/reminders", { method: "POST", body: JSON.stringify(input) });
}

export function updateReminder(
  id: string,
  input: Partial<ReminderInput>,
): Promise<{ success: boolean; data: Reminder }> {
  return api(`/schedule/reminders/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteReminder(id: string): Promise<{ success: boolean }> {
  return api(`/schedule/reminders/${id}`, { method: "DELETE" });
}
