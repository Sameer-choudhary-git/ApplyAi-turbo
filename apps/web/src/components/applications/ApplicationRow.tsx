import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Calendar, TrendingUp, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  applied: { label: 'Applied', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  under_review: { label: 'Under Review', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  shortlisted: { label: 'Shortlisted', class: 'bg-primary/10 text-primary border-primary/20' },
  interview_scheduled: { label: 'Interview', class: 'bg-accent/10 text-accent border-accent/20' },
  accepted: { label: 'Accepted', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Rejected', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  withdrawn: { label: 'Withdrawn', class: 'bg-muted text-muted-foreground border-border' },
};

const typeColors = {
  internship: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  job: 'bg-primary/10 text-primary border-primary/20',
  hackathon: 'bg-accent/10 text-accent border-accent/20',
  competition: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function ApplicationRow({ app }) {
  const status = statusConfig[app.status] || statusConfig.applied;

  return (
    <div className="px-6 py-5 hover:bg-muted/20 transition-colors group">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Main Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="font-semibold text-sm text-foreground truncate">{app.title}</h4>
            {app.url && (
              <a href={app.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{app.company}</span>
            {app.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{app.location}</span>}
            {app.applied_date && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{format(new Date(app.applied_date), 'MMM d, yyyy')}</span>}
            {app.success_probability > 0 && (
              <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/10">
                <TrendingUp className="w-3 h-3" />
                {Math.round(app.success_probability)}% match
              </span>
            )}
          </div>
          
          {app.stipend && (
            <p className="text-xs text-emerald-400/90 font-medium mt-2">💰 {app.stipend}</p>
          )}
        </div>

        {/* Badges Container */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {app.type && (
            <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wider', typeColors[app.type])}>
              {app.type}
            </Badge>
          )}
          <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wider', status.class)}>
            {status.label}
          </Badge>
        </div>
        
      </div>
    </div>
  );
}