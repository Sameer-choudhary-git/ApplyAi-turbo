import { useCallback, useEffect, useMemo, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type LabelHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, Copy, KeyRound, Loader2, Plus, RefreshCw, ShieldCheck, UserCog, XCircle } from "lucide-react";
import { TableSkeleton } from "@/components/ui/loading-skeletons";
import { assignCustomerPlan, createSubscriptionCode, getCustomerSubscriptionAudit, listSubscriptionCodes, listSubscriptionCustomers, listSubscriptionPlans, revokeCustomerEntitlement, revokeSubscriptionCode, type SubscriptionAuditEvent, type SubscriptionCodeSummary, type SubscriptionCustomer, type SubscriptionPlan } from "@/api/adminSubscriptions";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: "sm" | "md" };
function Button({ className = "", variant, size, ...props }: ButtonProps) { return <button {...props} className={`inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold transition-[transform,border-color,background-color,opacity] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-60 ${variant === "outline" ? "border-border bg-background/55 text-foreground hover:border-primary/40 hover:bg-secondary" : "border-primary bg-primary text-primary-foreground shadow-[0_14px_28px_-18px_hsl(var(--primary))] hover:opacity-90"} ${size === "sm" ? "px-2.5 py-1.5 text-xs" : ""} ${className}`} />; }
function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`h-11 w-full rounded-xl border border-border/80 bg-background/55 px-3.5 py-2 text-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 focus:border-primary/70 focus:bg-background/80 focus:ring-4 focus:ring-primary/10 ${className}`} />; }
function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`min-h-24 w-full rounded-xl border border-border/80 bg-background/55 px-3.5 py-3 text-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 focus:border-primary/70 focus:bg-background/80 focus:ring-4 focus:ring-primary/10 ${className}`} />; }
function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) { return <label {...props} className={`text-sm font-medium text-foreground ${className}`} />; }

function parseJson(value: string): Record<string, unknown> | undefined {
  if (!value.trim()) return undefined;
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Overrides must be a JSON object");
  return parsed as Record<string, unknown>;
}

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [codes, setCodes] = useState<SubscriptionCodeSummary[]>([]);
  const [customers, setCustomers] = useState<SubscriptionCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [tierKey, setTierKey] = useState("pro");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [codeFeatures, setCodeFeatures] = useState("");
  const [codeLimits, setCodeLimits] = useState("");
  const [selected, setSelected] = useState<SubscriptionCustomer | null>(null);
  const [assignmentTier, setAssignmentTier] = useState("pro");
  const [assignmentEndsAt, setAssignmentEndsAt] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [assignmentFeatures, setAssignmentFeatures] = useState("");
  const [assignmentLimits, setAssignmentLimits] = useState("");
  const [audit, setAudit] = useState<SubscriptionAuditEvent[]>([]);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planResponse, codeResponse, customerResponse] = await Promise.all([listSubscriptionPlans(), listSubscriptionCodes(), listSubscriptionCustomers(search || undefined)]);
      setPlans(planResponse.plans);
      setCodes(codeResponse.codes);
      setCustomers(customerResponse.customers);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load subscription controls");
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { void load(); }, [load]);
  const publicPlans = useMemo(() => plans.filter((plan) => plan.isPublic), [plans]);

  const generateCode = async () => {
    setBusy(true); setError(null); setMessage(null); setNewCode(null);
    try {
      const response = await createSubscriptionCode({ tierKey, maxRedemptions: Number(maxRedemptions) || 1, expiresAt: expiresAt || undefined, note: note || undefined, featureOverrides: parseJson(codeFeatures), limitOverrides: parseJson(codeLimits) });
      setNewCode(response.code.value); setMessage(`${response.code.tierName} code created. Copy it now; the plaintext will not be shown again.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create code"); } finally { setBusy(false); }
  };

  const selectCustomer = async (customer: SubscriptionCustomer) => {
    setSelected(customer); setAssignmentTier(customer.entitlement?.tierKey || "free"); setAssignmentEndsAt(customer.entitlement?.endsAt ? customer.entitlement.endsAt.slice(0, 10) : ""); setAssignmentFeatures(""); setAssignmentLimits(""); setAudit([]);
    try { const response = await getCustomerSubscriptionAudit(customer.id); setAudit(response.events); } catch { setAudit([]); }
  };

  const assignPlan = async () => {
    if (!selected) return;
    setBusy(true); setError(null); setMessage(null);
    try { await assignCustomerPlan(selected.id, { tierKey: assignmentTier, endsAt: assignmentEndsAt || null, note: assignmentNote || undefined, featureOverrides: parseJson(assignmentFeatures), limitOverrides: parseJson(assignmentLimits) }); setMessage(`${selected.email} is now on ${assignmentTier}.`); await load(); const refreshed = (await listSubscriptionCustomers(search || undefined)).customers.find((customer) => customer.id === selected.id); if (refreshed) await selectCustomer(refreshed); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to assign plan"); } finally { setBusy(false); }
  };

  const revokeSelected = async () => {
    if (!selected?.entitlement?.id) return;
    setBusy(true); setError(null);
    try { await revokeCustomerEntitlement(selected.entitlement.id); setMessage("Customer entitlement revoked."); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to revoke entitlement"); } finally { setBusy(false); }
  };

  const revokeCode = async (id: string) => {
    setBusy(true); setError(null);
    try { await revokeSubscriptionCode(id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to revoke code"); } finally { setBusy(false); }
  };

  return <div className="page-enter space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg"><KeyRound className="w-6 h-6 text-primary-foreground" /></div><div><h1 className="text-2xl lg:text-3xl font-heading font-bold">Plans & access</h1><p className="text-muted-foreground text-sm mt-1">Manage Free, Pro, and Max customer access without a payment gateway.</p></div></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div>
    {error && <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm text-rose-400"><AlertCircle className="w-4 h-4" />{error}</div>}
    {message && <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-300"><CheckCircle2 className="w-4 h-4" />{message}</div>}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{publicPlans.map((plan) => <div key={plan.key} className={`rounded-2xl border p-5 ${plan.key === "max" ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card/50"}`}><div className="flex items-center justify-between"><h2 className="font-heading font-semibold text-lg">{plan.name}</h2><span className="text-xs uppercase tracking-wider text-muted-foreground">{plan.key}</span></div><p className="text-sm text-muted-foreground mt-2 min-h-10">{plan.description}</p><p className="text-xs text-muted-foreground mt-4">{Object.entries(plan.limits).filter(([, value]) => value !== 0).slice(0, 3).map(([key, value]) => `${key.replaceAll("_", " ")}: ${value === -1 ? "unlimited" : value}`).join(" · ")}</p></div>)}</div>

    <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-5"><div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><h2 className="font-heading font-semibold text-lg">Generate customer access code</h2></div><p className="text-sm text-muted-foreground">Codes assign a plan. Optional JSON overrides let you grant a special limit or feature without editing the base plan.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><Label>Plan</Label><select value={tierKey} onChange={(event) => setTierKey(event.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-border bg-background px-3 text-sm">{publicPlans.map((plan) => <option key={plan.key} value={plan.key}>{plan.name}</option>)}</select></div><div><Label>Max redemptions</Label><Input type="number" min={1} value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} className="mt-1.5" /></div><div><Label>Expires on</Label><Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1.5" /></div><div><Label>Internal note</Label><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="March cohort" className="mt-1.5" /></div></div><div className="grid gap-4 md:grid-cols-2"><div><Label>Feature overrides JSON</Label><Textarea value={codeFeatures} onChange={(event) => setCodeFeatures(event.target.value)} placeholder={'{"analytics":true}'} className="mt-1.5 font-mono" /></div><div><Label>Limit overrides JSON</Label><Textarea value={codeLimits} onChange={(event) => setCodeLimits(event.target.value)} placeholder={'{"manual_runs_per_month":100}'} className="mt-1.5 font-mono" /></div></div><Button onClick={() => void generateCode()} disabled={busy} className="border-0 gradient-primary text-primary-foreground">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" />Generate {tierKey} code</>}</Button></div>
    {newCode && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5"><p className="text-sm font-semibold text-emerald-300">Copy this code now. It will not be shown again.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input readOnly value={newCode} className="font-mono tracking-wider" /><Button className="w-full sm:w-auto" variant="outline" onClick={() => void navigator.clipboard?.writeText(newCode)}><Copy className="w-4 h-4 mr-2" />Copy</Button></div></div>}

    <div className="grid xl:grid-cols-[1.1fr_.9fr] gap-6"><div className="overflow-hidden rounded-[24px] border border-border/70 bg-card/60 backdrop-blur-xl"><div className="flex flex-col gap-3 border-b border-border/50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-heading font-semibold text-lg">Customers</h2><p className="text-sm text-muted-foreground mt-1">Assign plans directly or open a customer to customize limits.</p></div><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="w-full sm:w-56" /></div>{loading ? <TableSkeleton label="Loading customers" rows={5} /> : <div className="divide-y divide-border/50">{customers.map((customer) => <div key={customer.id} className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{customer.fullName || "Unnamed user"}</p><p className="text-xs text-muted-foreground">{customer.email}</p></div><div className="flex w-full flex-wrap items-center gap-3 sm:w-auto"><span className="text-xs rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-primary">{customer.entitlement?.tierName || "Free"}</span><Button size="sm" variant="outline" onClick={() => void selectCustomer(customer)}><UserCog className="w-3.5 h-3.5 mr-1.5" />Manage</Button></div></div>)}</div>}</div>

    <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">{selected ? <><div><h2 className="font-heading font-semibold text-lg">Manage customer</h2><p className="text-sm text-muted-foreground mt-1">{selected.fullName} · {selected.email}</p></div><div><Label>Plan</Label><select value={assignmentTier} onChange={(event) => setAssignmentTier(event.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-border bg-background px-3 text-sm">{publicPlans.map((plan) => <option key={plan.key} value={plan.key}>{plan.name}</option>)}</select></div><div><Label>Ends on</Label><Input type="date" value={assignmentEndsAt} onChange={(event) => setAssignmentEndsAt(event.target.value)} className="mt-1.5" /></div><div><Label>Custom feature overrides JSON</Label><Textarea value={assignmentFeatures} onChange={(event) => setAssignmentFeatures(event.target.value)} placeholder={'{"priority_processing":true}'} className="mt-1.5 font-mono" /></div><div><Label>Custom limit overrides JSON</Label><Textarea value={assignmentLimits} onChange={(event) => setAssignmentLimits(event.target.value)} placeholder={'{"manual_runs_per_month":100}'} className="mt-1.5 font-mono" /></div><div><Label>Admin note</Label><Input value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} placeholder="VIP customer" className="mt-1.5" /></div><div className="flex flex-col gap-2 sm:flex-row"><Button className="w-full sm:w-auto" onClick={() => void assignPlan()} disabled={busy}>Assign plan</Button>{selected.entitlement?.id && <Button variant="outline" onClick={() => void revokeSelected()} disabled={busy}><XCircle className="w-4 h-4 mr-2" />Revoke access</Button>}</div><div className="pt-4 border-t border-border/50"><h3 className="font-medium text-sm">Recent audit history</h3>{audit.length === 0 ? <p className="text-xs text-muted-foreground mt-2">No events.</p> : <div className="mt-2 space-y-2 max-h-40 overflow-auto">{audit.slice(0, 8).map((event) => <p key={event.id} className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()} · {event.action}</p>)}</div>}</div></> : <div className="h-full min-h-64 flex flex-col items-center justify-center text-center text-muted-foreground"><UserCog className="w-8 h-8 mb-3" /><p>Select a customer to manage their plan.</p></div>}</div></div>

    <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden"><div className="p-5 border-b border-border/50"><h2 className="font-heading font-semibold text-lg">Issued codes</h2></div>{codes.length === 0 ? <div className="p-8 text-sm text-muted-foreground">No codes have been issued.</div> : <div className="divide-y divide-border/50">{codes.map((code) => { const revoked = Boolean(code.revokedAt); const exhausted = code.redemptionCount >= code.maxRedemptions; return <div key={code.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="font-mono font-semibold">{code.codePrefix}…</p><p className="text-sm text-muted-foreground mt-1">{code.tierName} · {code.redemptionCount}/{code.maxRedemptions}{code.hasOverrides ? " · custom overrides" : ""}{code.note ? ` · ${code.note}` : ""}</p><p className="text-xs text-muted-foreground mt-1">{code.expiresAt ? `Expires ${new Date(code.expiresAt).toLocaleDateString()}` : "No expiry"}</p></div><div>{revoked ? <span className="text-xs text-rose-400 flex items-center gap-1"><XCircle className="w-4 h-4" />Revoked</span> : exhausted ? <span className="text-xs text-amber-400">Fully redeemed</span> : <Button variant="outline" size="sm" onClick={() => void revokeCode(code.id)}>Revoke</Button>}</div></div>; })}</div>}</div>
  </div>;
}
