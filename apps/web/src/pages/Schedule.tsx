import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Video, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const mockApplications = [
  { id: 1, title: 'Software Engineer', company: 'Google', interview_date: new Date(Date.now() + 86400000).toISOString(), deadline: null },
  { id: 2, title: 'Frontend Dev', company: 'Vercel', interview_date: null, deadline: new Date(Date.now() + 172800000).toISOString() },
  { id: 3, title: 'System Architecture Round', company: 'Meta', interview_date: new Date(Date.now() + 259200000).toISOString(), deadline: null },
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
    .sort((a, b) => new Date(a.interview_date || a.deadline).getTime() - new Date(b.interview_date || b.deadline).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
          <CalendarIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Schedule</h1>
          <p className="text-muted-foreground text-sm mt-1">Interviews, deadlines, and important dates.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Calendar Widget */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
              <h3 className="font-heading font-bold text-xl text-foreground">{format(currentMonth, 'MMMM yyyy')}</h3>
              <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-3 font-semibold hover:bg-muted" onClick={() => setCurrentMonth(new Date)}>Today</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-3 mb-2">
                    {d}
                  </div>
                ))}
                
                {calendarDays.map((day, i) => {
                  const events = getEventsForDay(day);
                  const hasInterviews = events.interviews.length > 0;
                  const hasDeadlines = events.deadlines.length > 0;
                  const hasEvents = hasInterviews || hasDeadlines;
                  const isDayToday = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <div
                      key={i}
                      className={cn(
                        'min-h-[80px] p-2 rounded-xl transition-all border border-transparent flex flex-col',
                        !isCurrentMonth && 'opacity-20',
                        isCurrentMonth && 'hover:bg-muted/30 hover:border-border/50',
                        isDayToday && 'bg-primary/5 border-primary/30 shadow-[inset_0_0_15px_rgba(139,92,246,0.1)]',
                        hasEvents && !isDayToday && 'bg-card'
                      )}
                    >
                      <span className={cn(
                        'text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                        isDayToday ? 'bg-primary text-white shadow-md' : 'text-foreground/80'
                      )}>
                        {format(day, 'd')}
                      </span>
                      
                      <div className="mt-auto space-y-1.5 w-full px-1">
                        {hasInterviews && (
                          <div className="w-full h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                        )}
                        {hasDeadlines && (
                          <div className="w-full h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-center justify-center gap-6 mt-8 pt-4 border-t border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-2"><span className="w-4 h-1.5 rounded-full bg-accent" /> Interview</span>
                <span className="flex items-center gap-2"><span className="w-4 h-1.5 rounded-full bg-amber-400" /> Deadline</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming List Widget */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col">
            <div className="px-6 py-5 border-b border-border/50 bg-muted/10">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Upcoming</p>
              <h3 className="font-heading font-bold text-xl mt-0.5 text-foreground">Events Timeline</h3>
            </div>
            <CardContent className="p-5 flex-1">
              {upcomingEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center">
                   <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 border border-border/50">
                    <CalendarIcon className="w-5 h-5 text-muted-foreground/70" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Your schedule is clear</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((e, i) => (
                    <div key={e.id || i} className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'p-2.5 rounded-xl flex-shrink-0 shadow-inner',
                          e.interview_date ? 'bg-accent/10 border border-accent/20' : 'bg-amber-500/10 border border-amber-500/20'
                        )}>
                          {e.interview_date ? <Video className="w-4 h-4 text-accent" /> : <Clock className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{e.title}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="truncate">{e.company}</span>
                          </div>
                          <p className={cn(
                            "text-xs font-bold mt-2.5 flex items-center gap-1.5",
                            e.interview_date ? 'text-accent' : 'text-amber-400'
                          )}>
                            {format(new Date(e.interview_date || e.deadline), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}