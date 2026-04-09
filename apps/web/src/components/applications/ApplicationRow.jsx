import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Calendar, TrendingUp, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  applied: { label: 'Applied', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  under_review: { label: 'Under Review', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  shortlisted: { label: 'Shortlisted', class: 'bg-primary/10 text-primary border-primary/20' },
  interview_scheduled: { label: 'Interview', class: 'bg-accent/10 text-accent border-accent/20' },
  accepted: { label: 'Accepted', class: 'bg-green-500/10 text-green-600 border-green-500/20' },
  rejected: { label: 'Rejected', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  withdrawn: { label: 'Withdrawn', class: 'bg-muted text-muted-foreground border-border' },
};

const typeColors = {
  internship: 'bg-blue-500/10 text-blue-600',
  job: 'bg-primary/10 text-primary',
  hackathon: 'bg-accent/10 text-accent',
  competition: 'bg-orange-500/10 text-orange-600',
};

export default function ApplicationRow({ app }) {
  const status = statusConfig[app.status] || statusConfig.applied;

  return (
    <div className="px-5 py-4 hover:bg-muted/30 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{app.title}</h4>
            {app.url && (
              <a href={app.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{app.company}</span>
            {app.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.location}</span>}
            {app.applied_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(app.applied_date), 'MMM d')}</span>}
            {app.success_probability > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-accent" />
                {Math.round(app.success_probability)}% match
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {app.type && (
            <Badge variant="secondary" className={cn('text-[10px]', typeColors[app.type])}>
              {app.type}
            </Badge>
          )}
          <Badge variant="outline" className={cn('text-[10px] border', status.class)}>
            {status.label}
          </Badge>
        </div>
      </div>
      {app.stipend && (
        <p className="text-xs text-muted-foreground mt-1.5">💰 {app.stipend}</p>
      )}
    </div>
  );
}