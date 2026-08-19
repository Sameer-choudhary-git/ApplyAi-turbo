import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { Check, Loader2, RefreshCw, TicketPercent } from "lucide-react";
import { getMyEntitlement, getMyUsage, getPublicPlans, type Entitlement, type PublicPlan } from "@/api/entitlements";

type PlanButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string };
function Button({ className = "", variant, ...props }: PlanButtonProps) { return <button {...props} className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${variant === "outline" ? "border-border bg-transparent hover:bg-muted/30" : "border-primary bg-primary text-primary-foreground hover:opacity-90"} ${className}`} />; }

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
  const [usage, setUsage] = useState<Record<string, { used: number; limit: number; remaining: number } | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [planResponse, entitlementResponse, usageResponse] = await Promise.all([getPublicPlans(), getMyEntitlement(), getMyUsage()]);
      setPlans(planResponse.plans); setEntitlement(entitlementResponse.entitlement); setUsage(usageResponse.usage); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load plans"); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  return <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"><div className="flex items-center justify-between"><div><h1 className="text-2xl lg:text-3xl font-heading font-bold">Plans & services</h1><p className="text-muted-foreground text-sm mt-1">Your access is controlled by the plan assigned to your account.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div>{error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-400">{error}</div>}{loading ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : <><div className="rounded-2xl border border-primary/30 bg-primary/5 p-5"><p className="text-xs uppercase tracking-wider text-primary">Current plan</p><div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-2"><div><h2 className="text-2xl font-heading font-bold">{entitlement?.tierName || "Free"}</h2><p className="text-sm text-muted-foreground mt-1">{entitlement?.description || "Core ApplyAI access"}</p></div><div className="text-sm text-muted-foreground">{entitlement?.endsAt ? `Access ends ${new Date(entitlement.endsAt).toLocaleDateString()}` : "No scheduled expiry"}</div></div></div><div className="grid lg:grid-cols-3 gap-5">{plans.map((plan) => <div key={plan.key} className={`rounded-2xl border p-6 ${plan.key === entitlement?.tierKey ? "border-primary bg-primary/5" : "border-border/50 bg-card/50"}`}><div className="flex items-center justify-between"><h2 className="font-heading font-semibold text-xl">{plan.name}</h2>{plan.key === entitlement?.tierKey && <span className="text-xs rounded-full bg-primary px-2 py-1 text-primary-foreground">Active</span>}</div><p className="text-sm text-muted-foreground mt-2 min-h-10">{plan.description}</p><div className="mt-5 space-y-3">{Object.entries(plan.features).filter(([, enabled]) => enabled === true).map(([key]) => <div key={key} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-400" />{SERVICE_LABELS[key] || key.replaceAll("_", " ")}</div>)}{Object.entries(plan.limits).filter(([, value]) => value !== 0).slice(0, 5).map(([key, value]) => <div key={key} className="flex items-center justify-between text-xs text-muted-foreground"><span>{key.replaceAll("_", " ")}</span><span>{formatLimit(value)}</span></div>)}</div></div>)}</div><div className="rounded-2xl border border-border/50 bg-card/50 p-6"><h2 className="font-heading font-semibold text-lg">Current-period usage</h2><div className="grid md:grid-cols-3 gap-4 mt-4">{Object.entries(usage).filter(([, value]) => value).map(([metric, value]) => <div key={metric} className="rounded-xl border border-border/50 p-4"><p className="text-xs text-muted-foreground">{metric.replaceAll("_", " ")}</p><p className="text-xl font-semibold mt-1">{value?.limit === -1 ? `${value.used} / unlimited` : `${value?.used ?? 0} / ${value?.limit ?? 0}`}
</p></div>)}</div></div><div className="rounded-2xl border border-border/50 bg-card/50 p-5 flex gap-3"><TicketPercent className="w-5 h-5 text-primary mt-0.5" /><p className="text-sm text-muted-foreground">There is no payment gateway enabled yet. To upgrade, request a plan code from an administrator and redeem it during onboarding. Existing users can contact the administrator to have their plan assigned directly.</p></div></>}</div>;
}
