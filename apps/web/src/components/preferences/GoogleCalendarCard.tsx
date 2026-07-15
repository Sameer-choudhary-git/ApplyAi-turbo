import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck2, Loader2, Unlink } from "lucide-react";
import {
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
  connectGoogleCalendarUrl,
} from "@/api/googleCalendar";

export default function GoogleCalendarCard() {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<"connected" | "error" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: getGoogleCalendarStatus,
  });

  // Pick up the ?calendar=connected|error query param after OAuth redirect back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("calendar");
    if (status === "connected" || status === "error") {
      setBanner(status);
      queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient]);

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] }),
  });

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <CalendarCheck2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">
              Google Calendar
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Sync interviews, tasks, and reminders to your Google Calendar so
              you get notifications on your phone.
            </p>
            {data?.connected && data.email && (
              <p className="text-xs text-emerald-400 font-medium mt-2">
                Connected as {data.email}
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : data?.connected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="border-border/50 text-muted-foreground hover:text-rose-400 hover:border-rose-500/30"
          >
            {disconnectMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Unlink className="w-3.5 h-3.5 mr-1.5" /> Disconnect
              </>
            )}
          </Button>
        ) : (
          <Button
            size="sm"
            className="gradient-primary text-white border-0"
            onClick={async () => {
              const url = await connectGoogleCalendarUrl();
              window.location.href = url;
            }}
          >
            Connect
          </Button>
        )}
      </div>

      {banner === "connected" && (
        <div className="mt-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          Google Calendar connected successfully.
        </div>
      )}
      {banner === "error" && (
        <div className="mt-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          Something went wrong connecting Google Calendar. Please try again.
        </div>
      )}
    </Card>
  );
}
