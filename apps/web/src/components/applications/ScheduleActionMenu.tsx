import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  CalendarPlus,
  Video,
  Bell,
  ListTodo,
  Loader2,
  ChevronDown,
  MapPin,
  AlignLeft,
  Timer,
} from "lucide-react";
import type { Application } from "@/types/application";

type ScheduleKind = "interview" | "reminder" | "task";
type SchedulePayload = { kind: ScheduleKind; title: string; description?: string; interviewAt?: string; durationMinutes?: number; round?: string; meetingUrl?: string; remindAt?: string; endAt?: string; allDay?: boolean; location?: string; dueDate?: string; priority?: "LOW" | "MEDIUM" | "HIGH"; };


interface Props {
  app: Application;
  onScheduled?: () => void;
}

const KIND_CONFIG: Record<ScheduleKind,
  { label: string; icon: React.ElementType; dateLabel: string }
> = {
  interview: { label: "Schedule Interview", icon: Video, dateLabel: "Interview date & time" },
  reminder: { label: "Add Reminder", icon: Bell, dateLabel: "Remind me on" },
  task: { label: "Add Follow-up Task", icon: ListTodo, dateLabel: "Due date (optional)" },
};

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

function combineDateAndTime(date: string, time: string) {
  if (!date) return "";
  return time ? `${date}T${time}` : `${date}T00:00`;
}

export default function ScheduleActionMenu({ app, onScheduled }: Props) {
  const queryClient = useQueryClient();
  const [dialogKind, setDialogKind] = useState<ScheduleKind | null>(null);

  // shared
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // interview
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [round, setRound] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

  // task
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  // reminder
  const [allDay, setAllDay] = useState(false);
  const [remindDate, setRemindDate] = useState("");
  const [remindTime, setRemindTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setInterviewDate("");
    setInterviewTime("");
    setDurationMinutes(60);
    setRound("");
    setMeetingUrl("");
    setDueDate("");
    setPriority("MEDIUM");
    setAllDay(false);
    setRemindDate("");
    setRemindTime("");
    setEndDate("");
    setEndTime("");
    setLocation("");
  };

  const openDialog = (kind: ScheduleKind) => {
    reset();
    setDialogKind(kind);
    const defaults: Record<ScheduleKind, string> = {
      interview: `Interview ?f????s???,?? ${app.jobTitle}`,
      reminder: `${app.jobTitle} ?f????s???,?? reminder`,
      task: `Follow up ?f????s???,?? ${app.jobTitle}`,
    };
    setTitle(defaults[kind]);
  };

  const mutation = useMutation({
    mutationFn: (payload: SchedulePayload) =>
      api(`/applications/${app.id}/schedule`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogKind(null);
      onScheduled?.();
    },
  });

  const handleSubmit = () => {
    if (!dialogKind) return;

    const basePayload: SchedulePayload = { kind: dialogKind, title, description: description || undefined };

    if (dialogKind === "interview") {
      if (!interviewDate || !interviewTime) return;
      basePayload.interviewAt = combineDateAndTime(interviewDate, interviewTime);
      basePayload.durationMinutes = durationMinutes;
      basePayload.round = round || undefined;
      basePayload.meetingUrl = meetingUrl || undefined;
    } else if (dialogKind === "reminder") {
      if (!remindDate || (!allDay && !remindTime)) return;
      basePayload.remindAt = allDay
        ? `${remindDate}T00:00:00`
        : combineDateAndTime(remindDate, remindTime);
      basePayload.endAt = allDay
        ? endDate
          ? `${endDate}T23:59:59`
          : undefined
        : endDate
          ? combineDateAndTime(endDate, endTime || remindTime)
          : undefined;
      basePayload.allDay = allDay;
      basePayload.location = location || undefined;
    } else if (dialogKind === "task") {
      basePayload.dueDate = dueDate || undefined;
      basePayload.priority = priority;
    }

    mutation.mutate(basePayload);
  };

  const canSubmit = (() => {
    if (!dialogKind || !title.trim()) return false;
    if (dialogKind === "interview") return !!interviewDate && !!interviewTime;
    if (dialogKind === "reminder") return !!remindDate && (allDay || !!remindTime);
    return true; // task: date optional
  })();

  const kindMeta = dialogKind ? KIND_CONFIG[dialogKind] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-semibold border-border/50 bg-background/50 hover:bg-muted/50"
          >
            <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
            Schedule
            <ChevronDown className="w-3 h-3 ml-1.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-background/95 backdrop-blur-xl border-border/50 w-56"
        >
          {(Object.keys(KIND_CONFIG) as ScheduleKind[]).map((kind) => {
            const { label, icon: Icon } = KIND_CONFIG[kind];
            return (
              <DropdownMenuItem
                key={kind}
                onClick={() => openDialog(kind)}
                className="cursor-pointer gap-2.5 py-2.5"
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!dialogKind} onOpenChange={(o) => !o && setDialogKind(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {kindMeta && <kindMeta.icon className="w-4.5 h-4.5 text-primary" />}
              {kindMeta?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Title
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>

            {/* ?f???,?????s??f???,?????s? Interview fields ?f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s? */}
            {dialogKind === "interview" && (
              <>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {kindMeta?.dateLabel}
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <Input
                      type="date"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                    />
                    <Input
                      type="time"
                      value={interviewTime}
                      onChange={(e) => setInterviewTime(e.target.value)}
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                    <Timer className="w-3 h-3" /> Duration
                  </Label>
                  <Select
                    value={String(durationMinutes)}
                    onValueChange={(v) => setDurationMinutes(Number(v))}
                  >
                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
                      {DURATION_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Round (optional)
                  </Label>
                  <Input
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    placeholder="e.g. Technical Round 1"
                    className="mt-1.5 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Meeting URL (optional)
                  </Label>
                  <Input
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="mt-1.5 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
              </>
            )}

            {/* ?f???,?????s??f???,?????s? Reminder fields ?f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s? */}
            {dialogKind === "reminder" && (
              <>
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="rounded accent-primary w-4 h-4 cursor-pointer"
                  />
                  <Label htmlFor="allDay" className="text-sm text-foreground cursor-pointer select-none">
                    All day
                  </Label>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {kindMeta?.dateLabel}
                  </Label>
                  <div className={`grid ${allDay ? "grid-cols-1" : "grid-cols-2"} gap-2 mt-1.5`}>
                    <Input
                      type="date"
                      value={remindDate}
                      onChange={(e) => setRemindDate(e.target.value)}
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                    />
                    {!allDay && (
                      <Input
                        type="time"
                        value={remindTime}
                        onChange={(e) => setRemindTime(e.target.value)}
                        className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Ends <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
                  </Label>
                  <div className={`grid ${allDay ? "grid-cols-1" : "grid-cols-2"} gap-2 mt-1.5`}>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                    />
                    {!allDay && (
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Location (optional)
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location or link"
                    className="mt-1.5 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
              </>
            )}

            {/* ?f???,?????s??f???,?????s? Task fields ?f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s? */}
            {dialogKind === "task" && (
              <>
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {kindMeta?.dateLabel}
                  </Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1.5 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as "LOW" | "MEDIUM" | "HIGH")}>
                    <SelectTrigger className="mt-1.5 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ?f???,?????s??f???,?????s? Shared description field ?f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s??f???,?????s? */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
                <AlignLeft className="w-3 h-3" /> Notes (optional)
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any details..."
                className="mt-1.5 h-20 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 resize-none"
              />
            </div>

            <Button
              className="w-full gradient-primary text-white border-0 h-10 shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-shadow"
              onClick={handleSubmit}
              disabled={!canSubmit || mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `Add ${kindMeta?.label.split(" ").slice(-1)[0]}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
