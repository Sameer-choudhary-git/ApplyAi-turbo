import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Video,
  Building2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isAfter } from "date-fns";

interface Interview {
  id: string;
  title: string;
  company: string;
  round?: string | null;
  interviewAt: string;
  duration?: number | null;
  meetingUrl?: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
}

interface UpcomingInterviewsProps {
  interviews?: Interview[];
}

export default function UpcomingInterviews({
  interviews = [],
}: UpcomingInterviewsProps) {
  const upcomingInterviews = interviews
    .filter(
      (interview) =>
        interview.status === "SCHEDULED" &&
        isAfter(new Date(interview.interviewAt), new Date()),
    )
    .sort(
      (a, b) =>
        new Date(a.interviewAt).getTime() -
        new Date(b.interviewAt).getTime(),
    )
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="border-b border-border/50 bg-muted/10 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Upcoming
          </p>

          <h3 className="mt-0.5 font-heading text-lg font-bold">
            Interviews
          </h3>
        </div>

        <CardContent className="p-0">
          {upcomingInterviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground/70" />
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                No upcoming interviews
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {upcomingInterviews.map((interview) => (
                <div
                  key={interview.id}
                  className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {interview.title}
                      </h4>

                      {interview.round && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {interview.round}
                        </p>
                      )}
                    </div>

                    <Video className="h-4 w-4 flex-shrink-0 text-accent" />
                  </div>

                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{interview.company}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-primary" />

                      <span className="font-medium text-primary">
                        {format(
                          new Date(interview.interviewAt),
                          "MMM d, yyyy ??? h:mm a",
                        )}
                      </span>
                    </div>

                    {interview.meetingUrl && (
                      <a
                        href={interview.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Join Meeting
                      </a>
                    )}
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
