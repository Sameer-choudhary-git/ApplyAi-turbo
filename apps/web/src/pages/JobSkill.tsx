import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  
  Play,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
} from "react";
import { SearchResultsSkeleton } from "@/components/ui/loading-skeletons";

type JobSkillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  size?: "sm" | "md";
};
function Button({
  className = "",
  variant,
  size,
  ...props
}: JobSkillButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-bold transition-[transform,border-color,background-color,opacity] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-60 ${variant === "outline" ? "border-border bg-background/55 text-foreground hover:border-primary/40 hover:bg-secondary" : "border-primary bg-primary text-primary-foreground shadow-[0_14px_28px_-18px_hsl(var(--primary))] hover:opacity-90"} ${size === "sm" ? "px-2.5 py-1.5 text-xs" : ""} ${className}`}
    />
  );
}
function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-border/80 bg-background/55 px-3.5 py-2 text-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 focus:border-primary/70 focus:bg-background/80 focus:ring-4 focus:ring-primary/10 ${className}`}
    />
  );
}
function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={`text-sm font-medium text-foreground ${className}`}
    />
  );
}
import { getMyEntitlement, type Entitlement } from "@/api/entitlements";
import {
  applyToJobSkillOpportunity,
  getJobSkillProviders,
  getJobSkillSchedule,
  listJobSkillOpportunities,
  listJobSkillRuns,
  saveJobSkillOpportunity,
  saveJobSkillSchedule,
  startJobSkillRun,
  type JobSkillOpportunity,
  type JobSkillRun,
  type JobSkillSchedule,
} from "@/api/jobSkill";

function splitInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function statusColor(status: string): string {
  if (status === "completed") return "text-emerald-400";
  if (status === "failed") return "text-rose-400";
  if (
    status.includes("generating") ||
    status.includes("queued") ||
    status === "running"
  )
    return "text-amber-400";
  return "text-muted-foreground";
}

export default function JobSkill() {
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [opportunities, setOpportunities] = useState<JobSkillOpportunity[]>([]);
  const [runs, setRuns] = useState<JobSkillRun[]>([]);
  const [schedule, setSchedule] = useState<JobSkillSchedule | null>(null);
  const [providers, setProviders] = useState<
    Array<{
      key: string;
      label?: string;
      enabled: boolean;
      configured: boolean;
    }>
  >([]);
  const [roles, setRoles] = useState("");
  const [locations, setLocations] = useState("");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("60");
  const [cronExpression, setCronExpression] = useState("30 18 * * *");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [materialLimit, setMaterialLimit] = useState("10");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entitlementResponse = await getMyEntitlement();
      setEntitlement(entitlementResponse.entitlement);
      const enabled =
        entitlementResponse.entitlement?.features?.job_skill_search === true;
      if (!enabled) {
        setOpportunities([]);
        setRuns([]);
        setProviders([]);
        setMessage(null);
        return;
      }
      const [opportunitiesResponse, runsResponse, providerResponse] =
        await Promise.all([
          listJobSkillOpportunities({
            search: search || undefined,
            minScore: Number(minScore) || undefined,
          }),
          listJobSkillRuns(),
          getJobSkillProviders(),
        ]);
      setOpportunities(opportunitiesResponse.opportunities);
      setRuns(runsResponse.runs);
      setProviders(providerResponse.providers);
      try {
        const scheduleResponse = await getJobSkillSchedule();
        if (scheduleResponse.schedule) {
          setSchedule(scheduleResponse.schedule);
          setScheduleEnabled(scheduleResponse.schedule.enabled);
          setCronExpression(scheduleResponse.schedule.cronExpression);
          setTimezone(scheduleResponse.schedule.timezone);
          setMaterialLimit(String(scheduleResponse.schedule.materialLimit));
          setRoles(scheduleResponse.schedule.roles.join(", "));
          setLocations(scheduleResponse.schedule.locations.join(", "));
        }
      } catch {
        // Schedule is optional; the entitlement and opportunity views remain usable.
      }
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Job Skill is unavailable",
      );
    } finally {
      setLoading(false);
    }
  }, [minScore, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSearch = entitlement?.features?.job_skill_search === true;
  const canSchedule = entitlement?.features?.job_skill_schedule === true;
  const configuredProviders = useMemo(
    () => providers.filter((provider) => provider.configured),
    [providers],
  );

  const startRun = async () => {
    setRunning(true);
    setMessage(null);
    try {
      await startJobSkillRun({
        roles: splitInput(roles),
        locations: splitInput(locations),
        providerKeys: configuredProviders.map((provider) => provider.key),
        materialLimit: Number(materialLimit) || 0,
      });
      setMessage(
        "Job Skill run queued. The results will appear here as the worker completes each stage.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not start Job Skill run",
      );
    } finally {
      setRunning(false);
    }
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    setMessage(null);
    try {
      const response = await saveJobSkillSchedule({
        enabled: scheduleEnabled,
        cronExpression,
        timezone,
        roles: splitInput(roles),
        locations: splitInput(locations),
        providerKeys: configuredProviders.map((provider) => provider.key),
        materialLimit: Number(materialLimit) || 0,
      });
      setSchedule(response.schedule);
      setMessage(
        scheduleEnabled
          ? "Nightly Job Skill schedule enabled."
          : "Nightly Job Skill schedule paused.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save schedule",
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const saveOpportunity = async (id: string) => {
    try {
      await saveJobSkillOpportunity(id);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save opportunity",
      );
    }
  };

  const markApplied = async (id: string) => {
    try {
      await applyToJobSkillOpportunity(id);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update application",
      );
    }
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">
              Job Skill
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Find, score, prepare, and track opportunities. Job Skill never
              submits applications.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {message && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}
      {!canSearch && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="font-heading font-semibold text-lg text-amber-300">
            Job Skill access is not active
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your current tier is{" "}
            <strong>{entitlement?.tierName || "Free"}</strong>. Redeem an
            admin-issued access code from onboarding or ask an administrator to
            enable Job Skill.
          </p>
        </div>
      )}

      {canSearch && (
        <>
          <div className="grid xl:grid-cols-[1.2fr_.8fr] gap-6">
            <div className="rounded-[24px] border border-border/70 bg-card/60 p-6 space-y-5 backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading font-semibold text-lg">
                    Start a search
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use comma-separated targets. Active sources are shown below;
                    other provider adapters remain disabled until configured.
                  </p>
                </div>
                <Button onClick={() => void startRun()} disabled={running}>
                  <Play className="w-4 h-4 mr-2" />
                  {running ? "Queueing…" : "Run now"}
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Target roles</Label>
                  <Input
                    value={roles}
                    onChange={(event) => setRoles(event.target.value)}
                    placeholder="Frontend Engineer, React Developer"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Locations or Remote</Label>
                  <Input
                    value={locations}
                    onChange={(event) => setLocations(event.target.value)}
                    placeholder="Remote, Bengaluru, Delhi"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => (
                  <span
                    key={provider.key}
                    className={`px-2.5 py-1 rounded-full text-xs border ${provider.configured ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" : "border-border text-muted-foreground"}`}
                  >
                    {provider.label || provider.key}
                    {provider.configured ? " · active" : " · not configured"}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-card/60 p-6 space-y-4 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-semibold text-lg">
                  Nightly automation
                </h2>
              </div>
              {canSchedule ? (
                <>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(event) =>
                        setScheduleEnabled(event.target.checked)
                      }
                      className="accent-primary"
                    />
                    Enable per-user nightly search
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Cron</Label>
                      <Input
                        value={cronExpression}
                        onChange={(event) =>
                          setCronExpression(event.target.value)
                        }
                        className="mt-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <Label>Timezone</Label>
                      <Input
                        value={timezone}
                        onChange={(event) => setTimezone(event.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Materials per run</Label>
                    <Input
                      type="number"
                      min={0}
                      value={materialLimit}
                      onChange={(event) => setMaterialLimit(event.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <Button
                    className="w-full sm:w-auto"
                    variant="outline"
                    onClick={() => void saveSchedule()}
                    disabled={savingSchedule}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingSchedule ? "Saving…" : "Save schedule"}
                  </Button>
                  {schedule?.nextRunAt && (
                    <p className="text-xs text-muted-foreground">
                      Next run: {new Date(schedule.nextRunAt).toLocaleString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nightly automation is not enabled for this entitlement.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
            <div className="p-5 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-semibold text-lg">
                  Opportunity matches
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Fitness is an explainable ranking signal, not a guarantee of
                  qualification.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search roles or companies"
                    className="w-full pl-9"
                  />
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(event) => setMinScore(event.target.value)}
                  className="w-full sm:w-20"
                  title="Minimum score"
                />
              </div>
            </div>
            {loading ? (
              <SearchResultsSkeleton label="Loading Job Skill matches" rows={5} />
            ) : opportunities.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No matches yet. Start a run to populate this list.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {opportunities.map((opportunity) => (
                  <div key={opportunity.id} className="p-5 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {opportunity.title}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary">
                            {opportunity.fitnessScore ?? 0}% fit
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {opportunity.company}
                          {opportunity.location
                            ? ` · ${opportunity.location}`
                            : ""}
                          {opportunity.jobType
                            ? ` · ${opportunity.jobType}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void saveOpportunity(opportunity.id)}
                          disabled={Boolean(opportunity.savedJobId)}
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          {opportunity.savedJobId ? "Saved" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void markApplied(opportunity.id)}
                          disabled={Boolean(opportunity.applicationId)}
                        >
                          Mark applied
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            window.open(
                              opportunity.canonicalUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          Open
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {opportunity.scoreReason || "Score pending"}
                    </p>
                    {opportunity.artifacts?.some(
                      (artifact) => artifact.publicUrl,
                    ) && (
                      <div className="flex flex-wrap gap-2">
                        {opportunity.artifacts
                          .filter((artifact) => artifact.publicUrl)
                          .map((artifact) => (
                            <a
                              key={artifact.id}
                              href={artifact.publicUrl || undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Download {artifact.kind.replaceAll("_", " ")}
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <h2 className="font-heading font-semibold text-lg">
                Run history
              </h2>
            </div>
            {runs.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground">
                No runs yet.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {runs.slice(0, 10).map((run) => (
                  <div
                    key={run.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(run.createdAt).toLocaleString()}{" "}
                        <span className="text-xs text-muted-foreground">
                          · {run.triggerType}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {run.foundCount} matches · {run.generatedCount} material
                        sets · {run.providerCount} providers
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${statusColor(run.status)}`}
                      >
                        {run.status.replaceAll("_", " ")}
                      </span>
                      {run.artifacts?.[0]?.publicUrl && (
                        <a
                          href={run.artifacts[0].publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Open report
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
