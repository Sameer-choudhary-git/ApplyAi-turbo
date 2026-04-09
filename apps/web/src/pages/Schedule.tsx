import React, { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Video, Building2, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Mock data
const mockApplications = [
  { id: 1, title: 'Software Engineer', company: 'Tech Corp', interview_date: new Date(Date.now() + 86400000).toISOString(), deadline: null },
  { id: 2, title: 'Frontend Dev', company: 'Web Inc', interview_date: null, deadline: new Date(Date.now() + 172800000).toISOString() },
  { id: 3, title: 'Full Stack Dev', company: 'StartUp', interview_date: new Date(Date.now() + 259200000).toISOString(), deadline: null },
];

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const applications = mockApplications;

  const interviews = applications.filter(a => a.interview_date);
  const deadlines = applications.filter(a => a.deadline);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day) => {
    const dayInterviews = interviews.filter(a => isSameDay(new Date(a.interview_date), day));
    const dayDeadlines = deadlines.filter(a => isSameDay(new Date(a.deadline), day));
    return { interviews: dayInterviews, deadlines: dayDeadlines };
  };

  const upcomingEvents = [...interviews, ...deadlines]
    .filter(a => {
      const d = new Date(a.interview_date || a.deadline);
      return d >= new Date();
    })
    .sort((a, b) => new Date(a.interview_date || a.deadline) - new Date(b.interview_date || b.deadline))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold">Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">Interviews, deadlines, and important dates.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="border-border/50">
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-heading font-bold">{format(currentMonth, 'MMMM yyyy')}</h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date)}>Today</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-px">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                  const events = getEventsForDay(day);
                  const hasEvents = events.interviews.length > 0 || events.deadlines.length > 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'min-h-[60px] p-1.5 rounded-lg text-sm transition-colors',
                        !isSameMonth(day, currentMonth) && 'opacity-30',
                        isToday(day) && 'bg-primary/10 ring-1 ring-primary/30',
                        hasEvents && 'bg-muted/50'
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium',
                        isToday(day) && 'text-primary font-bold'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {events.interviews.length > 0 && (
                        <div className="mt-0.5">
                          <div className="w-full h-1 rounded-full bg-accent" />
                        </div>
                      )}
                      {events.deadlines.length > 0 && (
                        <div className="mt-0.5">
                          <div className="w-full h-1 rounded-full bg-orange-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full bg-accent" /> Interview</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded-full bg-orange-500" /> Deadline</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <div className="px-6 py-4 border-b border-border/50">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Upcoming</p>
              <h3 className="font-heading font-bold text-lg mt-0.5">Events</h3>
            </div>
            <CardContent className="p-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                upcomingEvents.map((e, i) => (
                  <div key={e.id || i} className="p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg flex-shrink-0',
                        e.interview_date ? 'bg-accent/10' : 'bg-orange-500/10'
                      )}>
                        {e.interview_date ? <Video className="w-3.5 h-3.5 text-accent" /> : <Clock className="w-3.5 h-3.5 text-orange-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.company}</p>
                        <p className="text-xs font-medium text-primary mt-1">
                          {format(new Date(e.interview_date || e.deadline), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}