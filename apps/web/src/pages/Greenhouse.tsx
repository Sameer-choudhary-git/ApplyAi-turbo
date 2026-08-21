import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type GreenhouseJob = {
  id: string;
  title: string;
  company: string;
  jobLink: string;
  location: string | null;
  firstPublished: string | null;
  sourceUpdatedAt: string | null;
  board: { company: string; boardToken: string; source: string };
};

type AutofillField = {
  field: string;
  source: string;
  value: string;
  confidence?: number;
};

type UnresolvedField = {
  field: string;
  required: boolean;
  reason: string;
  options?: string[];
  suggestedAnswer?: string | null;
};

type ApplicationMetadata = {
  greenhouseTag?: string;
  tags?: string[];
  autofill?: {
    completedAt?: string;
    fields?: AutofillField[];
    unresolved?: UnresolvedField[];
    submitted?: boolean;
    actionRequired?: boolean;
  };
};

type ApplicationRecord = {
  id: string;
  status: string;
  notes?: string | null;
  metadata?: ApplicationMetadata | null;
};

type JobsResponse = {
  success: boolean;
  data: GreenhouseJob[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

type SettingsResponse = {
  success: boolean;
  data: { autoSubmit: boolean };
};

type LimitsResponse = {
  success: boolean;
  data: {
    overallLimit: number;
    platformLimits: Record<string, number>;
    totalUsed: number;
    platformUsed: number;
    remainingOverall: number;
    remainingPlatform: number;
  };
};

function formatDate(value: string | null) {
  if (!value) return "Date not listed";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function Greenhouse() {
  const [jobs, setJobs] = useState<GreenhouseJob[]>([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limits, setLimits] = useState<LimitsResponse["data"] | null>(null);
  const [applications, setApplications] = useState<
    Record<string, ApplicationRecord>
  >({});
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const pollTimers = useRef<Record<string, number>>({});
  const [autoSubmitEnabled, setAutoSubmitEnabled] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  async function loadJobs() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (location.trim()) params.set("location", location.trim());
      const response = await api<JobsResponse>(
        `/greenhouse/jobs?${params.toString()}`,
      );
      setJobs(response.data ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load Greenhouse jobs",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadLimits() {
    try {
      const response = await api<LimitsResponse>("/greenhouse/limits");
      setLimits(response.data);
    } catch {
      // The jobs view remains useful when limits are not available.
    }
  }

  async function loadSettings() {
    try {
      const response = await api<SettingsResponse>("/greenhouse/settings");
      setAutoSubmitEnabled(response.data.autoSubmit);
    } catch {
      setAutoSubmitEnabled(false);
    }
  }

  useEffect(() => {
    void loadJobs();
    void loadLimits();
    void loadSettings();
    return () => {
      Object.values(pollTimers.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
    };
  }, []);

  function schedulePoll(job: GreenhouseJob, applicationId: string) {
    window.clearTimeout(pollTimers.current[job.id]);
    pollTimers.current[job.id] = window.setTimeout(async () => {
      try {
        const response = await api<{
          success: boolean;
          data: ApplicationRecord;
        }>(`/greenhouse/applications/${applicationId}`);
        setApplications((current) => ({ ...current, [job.id]: response.data }));
        if (["autofill_queued", "autofilling"].includes(response.data.status)) {
          schedulePoll(job, applicationId);
        }
      } catch {
        // The next user action can retry the status request.
      }
    }, 2500);
  }

  async function updateAutoSubmit(value: boolean) {
    setSettingsBusy(true);
    setError("");
    try {
      const response = await api<SettingsResponse>("/greenhouse/settings", {
        method: "PATCH",
        body: JSON.stringify({ autoSubmit: value }),
      });
      setAutoSubmitEnabled(response.data.autoSubmit);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update Greenhouse submission settings",
      );
    } finally {
      setSettingsBusy(false);
    }
  }

  async function prepare(job: GreenhouseJob) {
    setBusyJobId(job.id);
    setError("");
    try {
      const response = await api<{ success: boolean; data: ApplicationRecord }>(
        `/greenhouse/jobs/${job.id}/prepare`,
        { method: "POST" },
      );
      setApplications((current) => ({ ...current, [job.id]: response.data }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not prepare this application",
      );
    } finally {
      setBusyJobId(null);
    }
  }

  async function confirmAndAutofill(
    job: GreenhouseJob,
    application: ApplicationRecord,
  ) {
    setBusyJobId(job.id);
    setError("");
    try {
      const response = await api<{
        success: boolean;
        data: ApplicationRecord;
        jobId?: string;
      }>(`/greenhouse/applications/${application.id}/confirm`, {
        method: "POST",
      });
      setApplications((current) => ({ ...current, [job.id]: response.data }));
      schedulePoll(job, application.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not queue Greenhouse autofill",
      );
    } finally {
      setBusyJobId(null);
    }
  }

  async function queueAutofill(
    job: GreenhouseJob,
    application: ApplicationRecord,
  ) {
    setBusyJobId(job.id);
    setError("");
    try {
      await api(`/greenhouse/applications/${application.id}/autofill`, {
        method: "POST",
        body: JSON.stringify({ submit: false }),
      });
      schedulePoll(job, application.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not queue Greenhouse autofill",
      );
    } finally {
      setBusyJobId(null);
    }
  }

  async function submitAutomatically(
    job: GreenhouseJob,
    application: ApplicationRecord,
  ) {
    setBusyJobId(job.id);
    setError("");
    try {
      await api(`/greenhouse/applications/${application.id}/autofill`, {
        method: "POST",
        body: JSON.stringify({ submit: true }),
      });
      schedulePoll(job, application.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Automatic submission is disabled or failed",
      );
    } finally {
      setBusyJobId(null);
    }
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Discovery workspace
          </p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Greenhouse opportunities
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            ApplyAI fills verified profile fields automatically, drafts only
            truthful non-sensitive answers, and marks unanswered questions as
            action required.
          </p>
        </div>
        {limits && (
          <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-sm shadow-sm">
            <p className="font-semibold text-foreground">Daily capacity</p>
            <p className="mt-1 text-muted-foreground">
              {limits.remainingPlatform} Greenhouse slots remaining ·{" "}
              {limits.remainingOverall} overall slots remaining
            </p>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-amber-800">
            Automatic submission
          </p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-amber-900/80">
            When enabled, ApplyAI can submit only after Playwright verifies
            every required non-sensitive field. Legal, demographic, consent,
            ambiguous, or missing answers always stop with an action-required
            tag. The server must also have GREENHOUSE_AUTO_SUBMIT=true.
          </p>
        </div>
        <button
          type="button"
          disabled={settingsBusy}
          onClick={() => void updateAutoSubmit(!autoSubmitEnabled)}
          className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${autoSubmitEnabled ? "bg-amber-700" : "bg-slate-600"} disabled:opacity-50`}
        >
          {settingsBusy
            ? "Saving…"
            : autoSubmitEnabled
              ? "Enabled"
              : "Disabled"}
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 p-4 md:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search role or company"
          className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2"
        />
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Filter by location"
          className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2"
        />
        <button
          type="button"
          onClick={() => void loadJobs()}
          className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-sm text-muted-foreground">
          Loading newly discovered jobs…
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No active Greenhouse jobs match these filters yet. The next discovery
          run may add more companies.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {jobs.map((job) => {
            const application = applications[job.id];
            const isBusy = busyJobId === job.id;
            const autofill = application?.metadata?.autofill;
            const unresolved = autofill?.unresolved ?? [];
            return (
              <article
                key={job.id}
                className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm transition hover:border-primary/35"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      {job.company}
                    </p>
                    <h2 className="mt-2 text-lg font-bold text-foreground">
                      {job.title}
                    </h2>
                  </div>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                    {job.board.source}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span>{job.location || "Location not listed"}</span>
                  <span>Updated {formatDate(job.sourceUpdatedAt)}</span>
                  <span>{job.board.boardToken}</span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href={job.jobLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    View job
                  </a>
                  {!application && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void prepare(job)}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {isBusy ? "Preparing…" : "Prepare application"}
                    </button>
                  )}
                  {application?.status === "pending_confirmation" && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void confirmAndAutofill(job, application)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {isBusy ? "Queueing autofill…" : "Confirm & autofill"}
                    </button>
                  )}
                  {["autofill_queued", "autofilling"].includes(
                    application?.status || "",
                  ) && (
                    <span className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-600">
                      Autofilling form…
                    </span>
                  )}
                  {application?.status === "ready_to_submit" && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void submitAutomatically(job, application)
                        }
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {isBusy ? "Submitting…" : "Submit automatically"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            job.jobLink,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground"
                      >
                        Open form
                      </button>
                    </>
                  )}
                  {application?.status === "action_required" && (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          job.jobLink,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white"
                    >
                      Open & complete required fields
                    </button>
                  )}
                  {application?.status === "applied" && (
                    <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600">
                      Submitted automatically
                    </span>
                  )}
                </div>
                {application && (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {statusLabel(application.status)}
                  </p>
                )}
                {unresolved.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <p className="text-sm font-bold text-amber-700">
                      Action required: {unresolved.length} field(s)
                    </p>
                    <div className="mt-2 space-y-2">
                      {unresolved.map((item, index) => (
                        <div
                          key={`${item.field}-${index}`}
                          className="text-xs leading-5 text-amber-800"
                        >
                          <span className="font-semibold">{item.field}:</span>{" "}
                          {item.reason}
                          {item.suggestedAnswer
                            ? ` Suggested draft: ${item.suggestedAnswer}`
                            : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {application?.notes && (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {application.notes}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
