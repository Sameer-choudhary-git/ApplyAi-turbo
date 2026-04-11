import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Video, Building2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isAfter } from 'date-fns';

export default function UpcomingInterviews({ applications }) {
  const interviews = (applications || [])
    .filter(a => a.status === 'interview_scheduled' && a.interview_date && isAfter(new Date(a.interview_date), new Date()))
    .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime())
    .slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-5 border-b border-border/50 bg-muted/10">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Upcoming</p>
          <h3 className="font-heading font-bold text-lg mt-0.5">Interviews</h3>
        </div>
        <CardContent className="p-0">
          {interviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3 border border-border/50">
                <Calendar className="w-5 h-5 text-muted-foreground/70" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No upcoming interviews</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {interviews.map((app, i) => (
                <div key={app.id || i} className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm text-foreground">{app.title}</h4>
                    <Video className="w-4 h-4 text-accent flex-shrink-0" />
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{app.company}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span className="text-primary font-medium">
                        {format(new Date(app.interview_date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}