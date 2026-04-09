import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Building2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const statusConfig = {
  applied: { label: 'Applied', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  under_review: { label: 'Under Review', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  shortlisted: { label: 'Shortlisted', class: 'bg-primary/10 text-primary border-primary/20' },
  interview_scheduled: { label: 'Interview', class: 'bg-accent/10 text-accent border-accent/20' },
  accepted: { label: 'Accepted', class: 'bg-green-500/10 text-green-600 border-green-500/20' },
  rejected: { label: 'Rejected', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  withdrawn: { label: 'Withdrawn', class: 'bg-muted text-muted-foreground border-border' },
};

export default function RecentApplications({ applications }) {
  const recent = applications?.slice(0, 5) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="border-border/50">
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Recent Applications</p>
            <h3 className="font-heading font-bold text-lg mt-0.5">Latest Activity</h3>
          </div>
          <Link to="/applications" className="text-xs text-primary font-medium hover:underline">View All</Link>
        </div>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No applications yet. Your AI agent will start applying soon!
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recent.map((app, i) => {
                const status = statusConfig[app.status] || statusConfig.applied;
                return (
                  <div key={app.id || i} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate">{app.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{app.company}
                          </span>
                          {app.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{app.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] flex-shrink-0 border', status.class)}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {app.applied_date ? format(new Date(app.applied_date), 'MMM d, yyyy') : ''}
                      </span>
                      {app.platform && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {app.platform}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}