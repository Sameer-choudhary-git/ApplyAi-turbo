import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { Check, Loader2, RefreshCw, TicketPercent } from "lucide-react";
import {
  getMyEntitlement,
  getMyUsage,
  getPublicPlans,
  type Entitlement,
  type PublicPlan,
} from "@/api/entitlements";

type PlanButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "outline" | "solid";
};

function PlanButton({
  className = "",
  variant = "solid",
  ...props
}: PlanButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold transition-[transform,border-color,background-color,opacity] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-60 ${
        variant === "outline"
          ? "border-border bg-background/55 text-foreground hover:border-primary/40 hover:bg-secondary"
          : "border-primary bg-primary text-primary-foreground shadow-[0_14px_28px_-18px_hsl(var(--primary))] hover:opacity-90"
      } ${className}`}
    />
  );
}

function formatLimit(value: unknown): string {
  if (value === -1 || value === "unlimited") return "Unlimited";
  if (typeof value === "number") return String(value);
  return "Not included";
}

const SERVICE_LABELS: Record<string, string> = {
  saved_jobs: "Saved jobs",
  application_tracking: "Application tracking",
  networking: "Networking",
  job_skill_search: "Job Skill search",
  job_skill_schedule: "Nightly Job Skill automation",
  job_skill_materials: "Tailored resume and cover letters",
  resume_generation: "Resume generation",
  cover_letter_generation: "Cover-letter generation",
  analytics: "Analytics",
  priority_processing: "Priority processing",
};

export default function Plans() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [usage, setUsage] = useState<
    Record<string, { used: number; limit: number; remaining: number } | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [planResponse, entitlementResponse, usageResponse] =
        await Promise.all([getPublicPlans(), getMyEntitlement(), getMyUsage()]);
      setPlans(planResponse.plans);
      setEntitlement(entitlementResponse.entitlement);
      setUsage(usageResponse.usage);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="page-enter space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Access & usage</p>
          <h1 className="font-heading text-3xl font-extrabold tracking-[-0.04em] text-foreground lg:text-4xl">
            Plans & services
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            See what is active for your workspace and how much capacity remains
            in the current period.
          </p>
        </div>
        <PlanButton
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </PlanButton>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass flex min-h-48 items-center justify-center rounded-[28px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[28px] border border-primary/25 bg-primary/[0.07] p-6 shadow-[0_24px_60px_-42px_hsl(var(--primary))] lg:p-8">
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <p className="eyebrow text-primary">Current plan</p>
              <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="font-heading text-3xl font-extrabold tracking-[-0.04em] text-foreground">
                    {entitlement?.tierName || "Free"}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    {entitlement?.description || "Core Apply AI access"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {entitlement?.endsAt
                    ? `Access ends ${new Date(entitlement.endsAt).toLocaleDateString()}`
                    : "No scheduled expiry"}
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Compare access</p>
                <h2 className="mt-1 font-heading text-xl font-extrabold text-foreground">
                  Available plans
                </h2>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {plans.map((plan) => {
                const isActive = plan.key === entitlement?.tierKey;
                return (
                  <article
                    key={plan.key}
                    className={`rounded-[24px] border p-6 transition-[transform,border-color,background-color] hover:-translate-y-0.5 ${
                      isActive
                        ? "border-primary/55 bg-primary/[0.08] shadow-[0_20px_50px_-38px_hsl(var(--primary))]"
                        : "border-border/70 bg-card/65 hover:border-primary/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-heading text-xl font-extrabold text-foreground">
                        {plan.name}
                      </h3>
                      {isActive && (
                        <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-2 min-h-10 text-sm leading-6 text-muted-foreground">
                      {plan.description}
                    </p>
                    <div className="mt-6 space-y-3">
                      {Object.entries(plan.features)
                        .filter(([, enabled]) => enabled === true)
                        .map(([key]) => (
                          <div
                            key={key}
                            className="flex items-start gap-2 text-sm text-foreground/90"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                            <span>
                              {SERVICE_LABELS[key] || key.replaceAll("_", " ")}
                            </span>
                          </div>
                        ))}
                      {Object.entries(plan.limits)
                        .filter(([, value]) => value !== 0)
                        .slice(0, 5)
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-4 border-t border-border/50 pt-3 text-xs text-muted-foreground"
                          >
                            <span>{key.replaceAll("_", " ")}</span>
                            <span className="font-semibold text-foreground/80">
                              {formatLimit(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-border/70 bg-card/65 p-6 backdrop-blur-xl">
            <div className="mb-4">
              <p className="eyebrow">Current period</p>
              <h2 className="mt-1 font-heading text-xl font-extrabold text-foreground">
                Usage overview
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(usage)
                .filter(([, value]) => value)
                .map(([metric, value]) => (
                  <div
                    key={metric}
                    className="rounded-2xl border border-border/65 bg-background/35 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {metric.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 font-heading text-2xl font-extrabold text-foreground">
                      {value?.limit === -1
                        ? `${value.used} / unlimited`
                        : `${value?.used ?? 0} / ${value?.limit ?? 0}`}
                    </p>
                    {value?.limit !== -1 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {value?.remaining ?? 0} remaining
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </section>

          <div className="flex gap-3 rounded-[24px] border border-border/70 bg-card/45 p-5 backdrop-blur-xl">
            <TicketPercent className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm leading-6 text-muted-foreground">
              There is no payment gateway enabled yet. To upgrade, request a
              plan code from an administrator and redeem it during onboarding.
              Existing users can contact the administrator to have their plan
              assigned directly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
