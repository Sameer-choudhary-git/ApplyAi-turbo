import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Building2,
  ChevronLeft,
  ChevronRight,
  
  Bell,
  AlarmClock,
  MapPin,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfDay,
  isToday,
} from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import AddEventDialog from "@/components/schedule/AddEventDialog";
import { ScheduleSkeleton } from "@/components/ui/loading-skeletons";

type ScheduleEvent = {
  id: string;
  type: "INTERVIEW" | "TASK" | "REMINDER" | "DEADLINE";
  title: string;
  description?: string | null;
  location?: string | null;
  start: string;
  end?: string | null;
  allDay?: boolean;
  company?: string | null;
  sourceId?: string;
};

const EVENT_VISUALS: Record<ScheduleEvent["type"],
  { icon: React.ElementType; iconClass: string; bgClass: string; dotClass: string; label: string }
> = {
  INTERVIEW: {
    icon: Video,
    iconClass: "text-accent",
    bgClass: "bg-accent/10 border border-accent/20",
    dotClass: "bg-accent shadow-[0_0_8px_rgba(45,212,191,0.5)]",
    label: "Interview",
  },
  TASK: {
    icon: Clock,
    iconClass: "text-amber-400",
    bgClass: "bg-amber-500/10 border border-amber-500/20",
    dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    label: "Task",
  },
  REMINDER: {
    icon: Bell,
    iconClass: "text-rose-400",
    bgClass: "bg-rose-500/10 border border-rose-500/20",
    dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]",
    label: "Reminder",
  },
  DEADLINE: {
    icon: AlarmClock,
    iconClass: "text-orange-400",
    bgClass: "bg-orange-500/10 border border-orange-500/20",
    dotClass: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]",
    label: "Deadline",
  },
};

export default function Schedule() {
  const { user, isAuthenticated } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["schedule", user?.id],
    queryFn: async () => {
      const res = await api<{ success: boolean; events: ScheduleEvent[] }>("/schedule");
      return res.events || [];
    },
    enabled: isAuthenticated,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getEventsForDay = (day: Date) => {
    const dayInterviews = events.filter(
      (e) => e.type === "INTERVIEW" && e.start && isSameDay(new Date(e.start), day),
    );
    const dayTasks = events.filter(
      (e) => e.type === "TASK" && e.start && isSameDay(new Date(e.start), day),
    );
    const dayReminders = events.filter(
      (e) =>
        (e.type === "REMINDER" || e.type === "DEADLINE") &&
        e.start &&
        isSameDay(new Date(e.start), day),
    );
    return { interviews: dayInterviews, tasks: dayTasks, reminders: dayReminders };
  };

  // FIX: compare against the start of today, not the exact current timestamp,
  // so events scheduled earlier today (but still "today") still show up here
  // instead of silently disappearing once their clock time has passed.
  const todayStart = startOfDay(new Date());
  const upcomingEvents = events
    .filter((e) => e.start && new Date(e.start) >= todayStart)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 8);

  if (isLoading) {
    return <ScheduleSkeleton label="Loading schedule" />;
  }

  return (
    <div className="page-enter space-y-6 pb-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
            <CalendarIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">
              Schedule
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Interviews, deadlines, and important tasks.
            </p>
          </div>
        </div>

        <AddEventDialog />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
              <h3 className="font-heading font-bold text-xl text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 font-semibold hover:bg-muted"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <CardContent className="overflow-x-auto p-3 sm:p-6">
              <div className="grid grid-cols-7 gap-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-3 mb-2"
                  >
                    {d}
                  </div>
                ))}

                {calendarDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const hasInterviews = dayEvents.interviews.length > 0;
                  const hasTasks = dayEvents.tasks.length > 0;
                  const hasReminders = dayEvents.reminders.length > 0;
                  const hasEvents = hasInterviews || hasTasks || hasReminders;
                  const isDayToday = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-[64px] rounded-lg border border-transparent p-1 transition-all flex flex-col sm:min-h-[80px] sm:rounded-xl sm:p-2",
                        !isCurrentMonth && "opacity-20",
                        isCurrentMonth &&
                          "hover:bg-muted/30 hover:border-border/50",
                        isDayToday &&
                          "bg-primary/5 border-primary/30 shadow-[inset_0_0_15px_rgba(139,92,246,0.1)]",
                        hasEvents && !isDayToday && "bg-card",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold mb-1 sm:text-sm",
                          isDayToday
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-foreground/80",
                        )}
                      >
                        {format(day, "d")}
                      </span>

                      <div className="mt-auto space-y-1.5 w-full px-1">
                        {hasInterviews && (
                          <div className={cn("w-full h-1.5 rounded-full", EVENT_VISUALS.INTERVIEW.dotClass)} />
                        )}
                        {hasTasks && (
                          <div className={cn("w-full h-1.5 rounded-full", EVENT_VISUALS.TASK.dotClass)} />
                        )}
                        {hasReminders && (
                          <div className={cn("w-full h-1.5 rounded-full", EVENT_VISUALS.REMINDER.dotClass)} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-border/50 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:gap-6 sm:text-xs">
                <span className="flex items-center gap-2">
                  <span className={cn("w-4 h-1.5 rounded-full", EVENT_VISUALS.INTERVIEW.dotClass)} />
                  Interview
                </span>
                <span className="flex items-center gap-2">
                  <span className={cn("w-4 h-1.5 rounded-full", EVENT_VISUALS.TASK.dotClass)} />
                  Task
                </span>
                <span className="flex items-center gap-2">
                  <span className={cn("w-4 h-1.5 rounded-full", EVENT_VISUALS.REMINDER.dotClass)} />
                  Reminder
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming List Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col">
            <div className="px-6 py-5 border-b border-border/50 bg-muted/10">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                Upcoming
              </p>
              <h3 className="font-heading font-bold text-xl mt-0.5 text-foreground">
                Events Timeline
              </h3>
            </div>
            <CardContent className="p-5 flex-1 overflow-y-auto max-h-[600px]">
              {upcomingEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 border border-border/50">
                    <CalendarIcon className="w-5 h-5 text-muted-foreground/70" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Your schedule is clear
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((e, i) => {
                    const visual = EVENT_VISUALS[e.type] || EVENT_VISUALS.TASK;
                    const Icon = visual.icon;

                    return (
                      <div
                        key={e.id || i}
                        className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn("p-2.5 rounded-xl flex-shrink-0 shadow-inner", visual.bgClass)}>
                            <Icon className={cn("w-4 h-4", visual.iconClass)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground truncate">
                                {e.title}
                              </p>
                              <span
                                className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0",
                                  visual.bgClass,
                                  visual.iconClass,
                                )}
                              >
                                {visual.label}
                              </span>
                            </div>

                            {e.company && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                                <Building2 className="w-3.5 h-3.5" />
                                <span className="truncate">{e.company}</span>
                              </div>
                            )}

                            {e.location && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">{e.location}</span>
                              </div>
                            )}

                            {e.description && (
                              <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2 leading-relaxed">
                                {e.description}
                              </p>
                            )}

                            <p className={cn("text-xs font-bold mt-2.5 flex items-center gap-1.5", visual.iconClass)}>
                              {e.allDay
                                ? format(new Date(e.start), "MMM d, yyyy") + " · All day"
                                : format(new Date(e.start), "MMM d, yyyy • h:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
