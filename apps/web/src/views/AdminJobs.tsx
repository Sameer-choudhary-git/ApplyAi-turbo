import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Loader2, PlayCircle, Zap, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

interface JobInfo {
  key: string;
}

const JOB_LABELS: Record<string, string> = {
  "unstop-internships": "Extract Unstop Internships",
  "commudle-events": "Extract Commudle Events",
  "unstop-validation": "Validate Unstop Sessions",
  "apply-queue-eligible-user": "Queue Eligible Users for Apply",
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Request failed';

export default function AdminJobs() {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<{ key: string; success: boolean; message: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const res = await api<{ success: boolean; jobs: JobInfo[] }>("/admin/jobs");
      return res.jobs;
    },
    retry: false,
  });

  const triggerMutation = useMutation({
    mutationFn: (key: string) =>
      api<{ success: boolean; message?: string; error?: string }>(`/admin/jobs/${key}/trigger`, {
        method: "POST",
      }),
    onSuccess: (res, key) => {
      setLastResult({ key, success: res.success, message: res.message || res.error || "Done" });
    },
    onError: (err: unknown, key) => {
      setLastResult({ key, success: false, message: getErrorMessage(err) });
    },
  });

  const triggerAllMutation = useMutation({
    mutationFn: () =>
      api<{ success: boolean; message?: string; error?: string }>("/admin/jobs/trigger-all", {
        method: "POST",
      }),
    onSuccess: (res) => {
      setLastResult({ key: "all", success: res.success, message: res.message || res.error || "Done" });
    },
    onError: (err: unknown) => {
      setLastResult({ key: "all", success: false, message: getErrorMessage(err) });
    },
  });

  if (error) {
    return (
      <div className="max-w-2xl mx-auto pt-16 px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-4" />
        <h1 className="text-xl font-heading font-bold text-foreground">Access denied</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your account isn&apos;t in the admin allowlist, or you&apos;re not signed in.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-10 pb-20 px-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Job Runner</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manually trigger scheduled extraction and validation jobs.
          </p>
        </div>
      </div>

      {lastResult && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            lastResult.success
              ? "bg-sky-400/10 border-sky-400/20 text-sky-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {lastResult.success ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="font-semibold">
              {JOB_LABELS[lastResult.key] || (lastResult.key === "all" ? "All jobs" : lastResult.key)}
            </p>
            <p className="opacity-80 mt-0.5">{lastResult.message}</p>
          </div>
        </div>
      )}

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-2 divide-y divide-border/40">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          data?.map((job) => (
            <div key={job.key} className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {JOB_LABELS[job.key] || job.key}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{job.key}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-border/50 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                onClick={() => triggerMutation.mutate(job.key)}
                disabled={triggerMutation.isPending}
              >
                {triggerMutation.isPending && triggerMutation.variables === job.key ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                )}
                Trigger
              </Button>
            </div>
          ))
        )}
      </Card>

      <Button
        className="w-full gradient-primary text-white border-0 h-11"
        onClick={() => triggerAllMutation.mutate()}
        disabled={triggerAllMutation.isPending}
      >
        {triggerAllMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Zap className="w-4 h-4 mr-2" />
        )}
        Trigger All Jobs (same as daily cron)
      </Button>
    </div>
  );
}
