import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardGridSkeleton } from "@/components/ui/loading-skeletons";
import {
  AlertCircle,
  Bookmark,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Plus,
  Puzzle,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import {
  createSavedJob,
  deleteSavedJob,
  listSavedJobs,
  updateSavedJob,
  type SavedJob,
  type SavedJobInput,
  type SavedJobStatus,
  type SavedJobType,
} from "@/api/savedJobs";

const TYPE_COLORS: Record<SavedJobType, string> = {
  internship: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  job: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  hackathon: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  competition: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const STATUS_COLORS: Record<SavedJobStatus, string> = {
  saved: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  applied: "bg-sky-400/10 text-sky-300 border-sky-400/20",
  ignored: "bg-red-500/10 text-red-400 border-red-500/20",
};

const emptyForm: SavedJobInput = {
  title: "",
  company: "",
  url: "",
  location: "",
  work_mode: "",
  stipend: "",
  type: "job",
  source_site: "",
  notes: "",
  status: "saved",
  description: "",
  deadline: "",
};

export default function SavedJobs() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | SavedJobStatus>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SavedJobInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSavedJobs({
        search: search.trim() || undefined,
        status: filterStatus === "all" ? undefined : filterStatus,
      });
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved jobs");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadJobs(), 250);
    return () => window.clearTimeout(timer);
  }, [loadJobs]);

  const handleAddJob = async () => {
    if (!form.title.trim() || !form.company.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createSavedJob(form);
      setJobs((current) => [created, ...current]);
      setOpen(false);
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (job: SavedJob, status: SavedJobStatus) => {
    const previous = jobs;
    setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, status } : item)));
    try {
      await updateSavedJob(job.id, { status });
    } catch (err) {
      setJobs(previous);
      setError(err instanceof Error ? err.message : "Failed to update saved job");
    }
  };

  const handleDeleteJob = async (id: string) => {
    const previous = jobs;
    setJobs((current) => current.filter((job) => job.id !== id));
    try {
      await deleteSavedJob(id);
    } catch (err) {
      setJobs(previous);
      setError(err instanceof Error ? err.message : "Failed to delete saved job");
    }
  };

  const counts = useMemo(
    () => ({
      total: jobs.length,
      saved: jobs.filter((job) => job.status === "saved").length,
      applied: jobs.filter((job) => job.status === "applied").length,
    }),
    [jobs],
  );

  const updateForm = (field: keyof SavedJobInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleInputChange = (field: keyof SavedJobInput) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateForm(field, event.target.value);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
            <Bookmark className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Saved Jobs</h1>
            <p className="text-muted-foreground text-sm mt-1">Keep a personal, user-scoped pipeline of opportunities.</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" className="border-border/50 bg-card/50 gap-2 h-10" onClick={() => window.open("https://chrome.google.com/webstore", "_blank")}>
            <Puzzle className="w-4 h-4 text-primary" /> Get Extension
          </Button>
          <Button className="gradient-primary text-primary-foreground border-0 glow-primary h-10 px-5" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Save Job
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          ["Total Saved", counts.total, "text-violet-400"],
          ["To Apply", counts.saved, "text-amber-400"],
          ["Applied", counts.applied, "text-sky-300"],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-2xl border border-border/50 bg-card/50 p-5 text-center backdrop-blur-sm">
            <p className={`text-3xl font-heading font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border border-border/50 bg-card/50">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={handleSearchChange} placeholder="Search by title, company, or source..." className="pl-10 bg-background/50 border-border/50 h-10" />
        </div>
        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as "all" | SavedJobStatus)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-border/50 h-10"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="saved">Saved</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <CardGridSkeleton label="Loading saved jobs" cards={6} />
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <Bookmark className="w-10 h-10 text-muted-foreground/70 mb-4" />
          <p className="text-foreground font-semibold text-lg">No saved jobs yet</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[320px]">Save a job manually or from the browser extension to start building your pipeline.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {jobs.map((job, index) => (
              <motion.div key={job.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.04 }} className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading font-bold text-base leading-tight flex-1 pr-3 text-foreground">{job.title}</h3>
                    <button onClick={() => void handleDeleteJob(job.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 p-1.5 rounded-lg" title="Delete saved job"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-4"><Building2 className="w-4 h-4" /><span>{job.company}</span>{job.source_site && <><span className="text-border mx-1">•</span><Globe className="w-3.5 h-3.5" /><span>{job.source_site}</span></>}</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${TYPE_COLORS[job.type]}`}>{job.type}</Badge>
                    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[job.status]}`}>{job.status}</Badge>
                    {job.work_mode && <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider border-border/50 bg-muted/50">{job.work_mode}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground font-medium mb-5">
                    {job.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
                    {job.stipend && <span className="flex items-center gap-1.5 text-sky-300 font-bold">{job.stipend}</span>}
                    {job.deadline && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Due {format(new Date(job.deadline), "MMM d")}</span>}
                  </div>
                  {job.notes && <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">{job.notes}</p>}
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  {job.status === "saved" ? <Button size="sm" className="h-9 font-semibold gradient-primary text-primary-foreground border-0 flex-1" onClick={() => void handleUpdateStatus(job, "applied")}><Send className="w-3.5 h-3.5 mr-1.5" /> Mark Applied</Button> : job.status === "applied" ? <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-sky-300 bg-sky-400/10 border border-sky-400/20 rounded-md h-9 flex-1"><CheckCircle2 className="w-4 h-4" /> Applied</div> : <Button size="sm" variant="outline" className="h-9 flex-1" onClick={() => void handleUpdateStatus(job, "saved")}>Restore</Button>}
                  {job.url && <a href={job.url.startsWith("http") ? job.url : `https://${job.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-9 h-9 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary border border-border/50" title="Open job"><ExternalLink className="w-4 h-4" /></a>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-xl">Save a Job Posting</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Job Title *</Label><Input value={form.title} onChange={handleInputChange("title")} placeholder="Frontend Developer Intern" className="mt-1.5" /></div>
              <div><Label>Company *</Label><Input value={form.company} onChange={handleInputChange("company")} placeholder="Google" className="mt-1.5" /></div>
              <div><Label>Type</Label><Select value={form.type} onValueChange={(value) => updateForm("type", value)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(["internship", "job", "hackathon", "competition"] as SavedJobType[]).map((type) => <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2"><Label>Job URL</Label><Input value={form.url} onChange={handleInputChange("url")} placeholder="https://..." className="mt-1.5" /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={handleInputChange("location")} placeholder="Remote" className="mt-1.5" /></div>
              <div><Label>Work mode</Label><Input value={form.work_mode} onChange={handleInputChange("work_mode")} placeholder="Hybrid" className="mt-1.5" /></div>
              <div><Label>Stipend / salary</Label><Input value={form.stipend} onChange={handleInputChange("stipend")} placeholder="₹50,000 / month" className="mt-1.5" /></div>
              <div><Label>Source site</Label><Input value={form.source_site} onChange={handleInputChange("source_site")} placeholder="LinkedIn" className="mt-1.5" /></div>
              <div className="sm:col-span-2"><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={handleInputChange("deadline")} className="mt-1.5" /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={handleInputChange("notes")} placeholder="Why this role is a good fit..." className="mt-1.5" /></div>
            </div>
            <Button className="h-10 w-full border-0 gradient-primary text-primary-foreground" onClick={() => void handleAddJob()} disabled={!form.title.trim() || !form.company.trim() || submitting}>{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Job"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
