import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, KeyRound, Loader2, Plus, ShieldCheck, XCircle } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes } from "react";
type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: "sm" | "md" };
function Button({ className = "", variant, size, ...props }: AdminButtonProps) {
  return <button {...props} className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${variant === "outline" ? "border-border bg-transparent hover:bg-muted/30" : "border-primary bg-primary text-primary-foreground hover:opacity-90"} ${size === "sm" ? "px-2.5 py-1.5 text-xs" : ""} ${className}`} />;
}
function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary ${className}`} />;
}
function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-sm font-medium text-foreground ${className}`} />;
}

import {
  createSubscriptionCode,
  listSubscriptionCodes,
  revokeSubscriptionCode,
  type SubscriptionCodeSummary,
} from "@/api/adminSubscriptions";

export default function AdminSubscriptions() {
  const [codes, setCodes] = useState<SubscriptionCodeSummary[]>([]);
  const [tierKey, setTierKey] = useState("job_skill");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listSubscriptionCodes();
      setCodes(response.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subscription codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const handleCreate = async () => {
    const count = Number(maxRedemptions);
    if (!Number.isInteger(count) || count < 1) {
      setError("Maximum redemptions must be a positive number");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await createSubscriptionCode({
        tierKey,
        maxRedemptions: count,
        expiresAt: expiresAt || undefined,
        note: note || undefined,
      });
      setNewCode(response.code.value);
      setNote("");
      setExpiresAt("");
      setMaxRedemptions("1");
      await loadCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create subscription code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeSubscriptionCode(id);
      await loadCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke subscription code");
    }
  };

  const copyCode = async () => {
    if (!newCode) return;
    await navigator.clipboard.writeText(newCode);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg"><KeyRound className="w-6 h-6 text-white" /></div>
        <div><h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Subscription Access</h1><p className="text-muted-foreground text-sm mt-1">Generate and manage payment-free access codes.</p></div>
      </div>

      {error && <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm text-rose-400"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-5">
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /><h2 className="font-heading font-semibold text-lg">Generate access code</h2></div>
        <p className="text-sm text-muted-foreground">The plaintext code is shown only once. Store or send it securely to the user.</p>
        <div className="grid md:grid-cols-4 gap-4">
          <div><Label>Tier</Label><select value={tierKey} onChange={(event) => setTierKey(event.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"><option value="job_skill">Job Skill</option><option value="free">Free</option></select></div>
          <div><Label>Max redemptions</Label><Input type="number" min={1} value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} className="mt-1.5" /></div>
          <div><Label>Expires on</Label><Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1.5" /></div>
          <div><Label>Internal note</Label><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Beta cohort" className="mt-1.5" /></div>
        </div>
        <Button onClick={() => void handleCreate()} disabled={submitting} className="gradient-primary text-white border-0">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" />Generate code</>}</Button>
      </div>

      {newCode && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5"><p className="text-sm font-semibold text-emerald-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Code created. Copy it now; it will not be shown again.</p><div className="flex gap-2 mt-3"><Input readOnly value={newCode} className="font-mono tracking-wider" /><Button variant="outline" onClick={() => void copyCode()}><Copy className="w-4 h-4 mr-2" />Copy</Button></div></div>}

      <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="p-5 border-b border-border/50"><h2 className="font-heading font-semibold text-lg">Issued codes</h2></div>
        {loading ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : codes.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No codes have been issued.</div> : <div className="divide-y divide-border/50">{codes.map((code) => { const revoked = Boolean(code.revokedAt); const exhausted = code.redemptionCount >= code.maxRedemptions; return <div key={code.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="font-mono font-semibold text-foreground">{code.codePrefix}…</p><p className="text-sm text-muted-foreground mt-1">{code.tierName} · {code.redemptionCount}/{code.maxRedemptions} redemptions{code.note ? ` · ${code.note}` : ""}</p><p className="text-xs text-muted-foreground mt-1">{code.expiresAt ? `Expires ${new Date(code.expiresAt).toLocaleDateString()}` : "No expiry"}</p></div><div className="flex items-center gap-3">{revoked ? <span className="text-xs text-rose-400 flex items-center gap-1"><XCircle className="w-4 h-4" />Revoked</span> : exhausted ? <span className="text-xs text-amber-400">Fully redeemed</span> : <Button variant="outline" size="sm" onClick={() => void handleRevoke(code.id)}>Revoke</Button>}</div></div>; })}</div>}
      </div>
    </div>
  );
}
