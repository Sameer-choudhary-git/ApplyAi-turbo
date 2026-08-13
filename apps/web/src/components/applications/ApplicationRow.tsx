// import React from "react";
// import { Badge } from "@/components/ui/badge";
// import {
//   Building2,
//   MapPin,
//   Calendar,
//   TrendingUp,
//   ExternalLink,
// } from "lucide-react";
// import { format } from "date-fns";
// import { cn } from "@/lib/utils";
// import ScheduleActionMenu from "./ScheduleActionMenu";

// const statusConfig = {
//   applied: { label: "Applied", class: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
//   under_review: { label: "Under Review", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
//   shortlisted: { label: "Shortlisted", class: "bg-primary/10 text-primary border-primary/20" },
//   interview_scheduled: { label: "Interview", class: "bg-accent/10 text-accent border-accent/20" },
//   accepted: { label: "Accepted", class: "bg-sky-400/10 text-sky-300 border-sky-400/20" },
//   rejected: { label: "Rejected", class: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
//   withdrawn: { label: "Withdrawn", class: "bg-muted text-muted-foreground border-border" },
// };

// const typeColors = {
//   internship: "bg-blue-500/10 text-blue-400 border-blue-500/20",
//   job: "bg-primary/10 text-primary border-primary/20",
//   hackathon: "bg-accent/10 text-accent border-accent/20",
//   competition: "bg-orange-500/10 text-orange-400 border-orange-500/20",
// };

// interface ApplicationRowProps {
//   app: any;
//   onInterviewScheduled?: () => void;
// }

// export default function ApplicationRow({ app, onInterviewScheduled }: ApplicationRowProps) {
//   const status = statusConfig[app.status] || statusConfig.applied;

//   return (
//     <div className="px-6 py-5 hover:bg-muted/20 transition-colors group">
//       <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
//         {/* Main Info */}
//         <div className="min-w-0 flex-1">
//           <div className="flex items-center gap-2 mb-1.5">
//             <h4 className="font-semibold text-sm text-foreground truncate">
//               {app.title}
//             </h4>
//             {app.url && (
//               <a
              
//                 href={app.url}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
//               >
//                 <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
//               </a>
//             )}
//           </div>

//           <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground font-medium">
//             <span className="flex items-center gap-1.5">
//               <Building2 className="w-3.5 h-3.5" />
//               {app.company}
//             </span>
//             {app.location && (
//               <span className="flex items-center gap-1.5">
//                 <MapPin className="w-3.5 h-3.5" />
//                 {app.location}
//               </span>
//             )}
//             {app.applied_date && (
//               <span className="flex items-center gap-1.5">
//                 <Calendar className="w-3.5 h-3.5" />
//                 {format(new Date(app.applied_date), "MMM d, yyyy")}
//               </span>
//             )}
//             {app.success_probability > 0 && (
//               <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/10">
//                 <TrendingUp className="w-3 h-3" />
//                 {Math.round(app.success_probability)}% match
//               </span>
//             )}
//           </div>

//           {app.stipend && (
//             <p className="text-xs text-sky-300/90 font-medium mt-2">
//               ?Y'? {app.stipend}
//             </p>
//           )}
//         </div>

//         {/* Badges + Actions */}
//         <div className="flex items-center gap-2 flex-shrink-0">
//           {app.type && (
//             <Badge
//               variant="outline"
//               className={cn(
//                 "text-[10px] font-semibold uppercase tracking-wider",
//                 typeColors[app.type],
//               )}
//             >
//               {app.type}
//             </Badge>
//           )}
//           <Badge
//             variant="outline"
//             className={cn(
//               "text-[10px] font-semibold uppercase tracking-wider",
//               status.class,
//             )}
//           >
//             {status.label}
//           </Badge>

//           {/* Dropdown lives outside the badges, as its own control */}
//           <ScheduleActionMenu app={app} onScheduled={onInterviewScheduled} />
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  ExternalLink,
  Pencil,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import ScheduleActionMenu from "./ScheduleActionMenu";

// ?o. Canonical status config, keyed by NORMALIZED status (lowercase, underscores).
// This now covers both the user-facing lifecycle AND the raw statuses the
// apply agent actually writes (APPLIED, ACTION_REQUIRED, ALREADY_APPLIED, ERROR),
// so nothing falls through to a silently-wrong default anymore.
const statusConfig: Record<string, { label: string; class: string }> = {
  applied: { label: "Applied", class: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  already_applied: { label: "Already Applied", class: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  under_review: { label: "Under Review", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  action_required: { label: "Action Required", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  shortlisted: { label: "Shortlisted", class: "bg-primary/10 text-primary border-primary/20" },
  interview_scheduled: { label: "Interview", class: "bg-accent/10 text-accent border-accent/20" },
  accepted: { label: "Accepted", class: "bg-sky-400/10 text-sky-300 border-sky-400/20" },
  rejected: { label: "Rejected", class: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  error: { label: "Error", class: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  withdrawn: { label: "Withdrawn", class: "bg-muted text-muted-foreground border-border" },
};

// Statuses selectable from the manual editor (value = what gets sent to the API)
const EDITABLE_STATUSES = [
  "applied",
  "already_applied",
  "under_review",
  "action_required",
  "shortlisted",
  "interview_scheduled",
  "accepted",
  "rejected",
  "error",
  "withdrawn",
];

function normalizeStatus(status?: string) {
  return (status || "").trim().toLowerCase();
}

function getStatusDisplay(status?: string) {
  const key = normalizeStatus(status);
  if (statusConfig[key]) return statusConfig[key];

  // ?o. Unmapped statuses now surface AS-IS (instead of silently becoming
  // "Applied"), so a mismatch like this is visible and debuggable in the UI.
  return {
    label: status || "Unknown",
    class: "bg-muted text-muted-foreground border-border",
  };
}

const typeColors: Record<string, string> = {
  internship: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  job: "bg-primary/10 text-primary border-primary/20",
  hackathon: "bg-accent/10 text-accent border-accent/20",
  competition: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

interface ApplicationRowProps {
  app: any;
  onInterviewScheduled?: () => void;
}

export default function ApplicationRow({ app, onInterviewScheduled }: ApplicationRowProps) {
  const queryClient = useQueryClient();
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const status = getStatusDisplay(app.status);

  // ?o. Manual status correction ??" assumes PATCH /applications/:id/status.
  // Adjust the path/body shape if your actual API route differs.
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      api(`/applications/${app.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setIsEditingStatus(false);
    },
  });

  return (
    <div className="px-6 py-5 hover:bg-muted/20 transition-colors group">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Main Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="font-semibold text-sm text-foreground truncate">
              {app.title}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {app.company}
            </span>
            {app.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {app.location}
              </span>
            )}
            {app.applied_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(app.applied_date), "MMM d, yyyy")}
              </span>
            )}
            {app.success_probability > 0 && (
              <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/10">
                <TrendingUp className="w-3 h-3" />
                {Math.round(app.success_probability)}% match
              </span>
            )}
          </div>

          {app.stipend && (
            <p className="text-xs text-sky-300/90 font-medium mt-2">
              ?Y'? {app.stipend}
            </p>
          )}
        </div>

        {/* Badges + Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {app.type && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                typeColors[app.type],
              )}
            >
              {app.type}
            </Badge>
          )}

          {/* Status badge ??" click the pencil to correct it manually */}
          {isEditingStatus ? (
            <div className="flex items-center gap-1">
              <select
                autoFocus
                defaultValue={normalizeStatus(app.status)}
                disabled={updateStatusMutation.isPending}
                onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                onBlur={() => setIsEditingStatus(false)}
                className="text-[11px] rounded-md border border-border/50 bg-background px-1.5 py-1 text-foreground"
              >
                {EDITABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusConfig[s].label}
                  </option>
                ))}
              </select>
              {updateStatusMutation.isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingStatus(true)}
              className="flex items-center gap-1 group/status"
              title="Click to correct status"
            >
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  status.class,
                )}
              >
                {status.label}
              </Badge>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/status:opacity-100 transition-opacity" />
            </button>
          )}

          

          {/* Dropdown lives outside the badges, as its own control */}
          <ScheduleActionMenu app={app} onScheduled={onInterviewScheduled} />
          {/* ?o. Always-visible open-link action (previously only appeared next
              to the title, and only on row hover ??" easy to miss) */}
          {app.jobLink && (
            <a
              href={app.jobLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Open job listing"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border/50 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
