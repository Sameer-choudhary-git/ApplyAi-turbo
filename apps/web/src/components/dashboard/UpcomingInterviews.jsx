import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isAfter } from 'date-fns';

export default function UpcomingInterviews({ applications }) {
  const interviews = (applications || [])
    .filter(a => a.status === 'interview_scheduled' && a.interview_date && isAfter(new Date(a.interview_date), new Date()))
    .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date))
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card className="border-border/50">
        <div className="px-6 py-4 border-b border-border/50">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Upcoming</p>
          <h3 className="font-heading font-bold text-lg mt-0.5">Interviews</h3>
        </div>
        <CardContent className="p-4 space-y-3">
          {interviews.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No upcoming interviews
            </div>
          ) : (
            interviews.map((app, i) => (
              <div key={app.id || i} className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-sm">{app.title}</h4>
                  <Video className="w-4 h-4 text-accent" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="w-3 h-3" />
                  <span>{app.company}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3 text-primary" />
                  <span className="text-primary font-medium">
                    {format(new Date(app.interview_date), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}