import React, { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Bookmark, Plus, ExternalLink, Trash2, Send,
  Building2, MapPin, Clock, Globe, Search, Puzzle, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
const TYPE_COLORS = {
  internship: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  job: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  hackathon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  competition: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};
const STATUS_COLORS = {
  saved: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  applied: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ignored: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const empty = { title: '', company: '', url: '', location: '', work_mode: '', stipend: '', type: 'internship', source_site: '', notes: '', status: 'saved', description: '', deadline: '' };

const mockJobs = [
  { id: 1, title: 'Frontend Developer Intern', company: 'Google', url: 'https://google.com/careers', location: 'Mountain View, CA', work_mode: 'On-site', stipend: '50,000', type: 'internship', source_site: 'LinkedIn', notes: 'Requires strong React skills.', status: 'saved', deadline: '2024-12-31' },
  { id: 2, title: 'Backend Engineer', company: 'Meta', url: 'https://meta.com/careers', location: 'Remote', work_mode: 'Remote', stipend: '75,000', type: 'job', source_site: 'Indeed', notes: 'Great benefits package.', status: 'applied', deadline: '2024-11-30' },
  { id: 3, title: 'Global Hackathon', company: 'Unstop', url: 'https://unstop.com', location: 'Online', work_mode: 'Remote', stipend: '10,000', type: 'hackathon', source_site: 'Unstop', notes: 'Team of 4 needed.', status: 'saved', deadline: '2024-10-15' },
];

export default function SavedJobs() {
  const [jobs, setJobs] = useState(mockJobs);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const handleAddJob = (newJob: typeof empty) => {
    setJobs([{ ...newJob, id: Math.max(...jobs.map(j => j.id), 0) + 1 }, ...jobs]);
    setOpen(false);
    setForm(empty);
  };

  const handleUpdateJob = (id: number, data: Partial<typeof empty>) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, ...data } : j));
  };

  const handleDeleteJob = (id: number) => {
    setJobs(jobs.filter(j => j.id !== id));
  };

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || j.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const saved = jobs.filter(j => j.status === 'saved').length;
  const applied = jobs.filter(j => j.status === 'applied').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
            <Bookmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Job Saver</h1>
            <p className="text-muted-foreground text-sm mt-1">Bookmark jobs manually or via the extension.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-border/50 bg-card/50 backdrop-blur-sm gap-2 h-10 hover:bg-muted/50" onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}>
            <Puzzle className="w-4 h-4 text-primary" /> Get Extension
          </Button>
          <Button className="gradient-primary text-white border-0 glow-primary hover:opacity-90 h-10 px-5 shadow-lg" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Save Job
          </Button>
        </div>
      </div>

      {/* Extension CTA */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-violet-500/5 to-accent/10 p-6 backdrop-blur-sm">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg glow-primary flex-shrink-0">
              <Puzzle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-bold text-foreground text-lg">Browser Extension (Coming Soon)</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                1-click save any job from LinkedIn, Unstop, Internshala, or any company site directly to your EngiBuddy tracker.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['LinkedIn', 'Unstop', 'Internshala', 'Indeed', 'AngelList', 'Any site'].map(s => (
                  <Badge key={s} variant="outline" className="text-[10px] font-semibold tracking-wider border-primary/20 text-primary/80 bg-primary/5 uppercase">{s}</Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 mt-4 md:mt-0 w-full md:w-auto h-10 px-6 font-semibold shadow-sm">
              Notify Me
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Saved', value: jobs.length, color: 'text-violet-400', bg: 'from-violet-500/10 to-purple-500/5', border: 'border-violet-500/20' },
          { label: 'To Apply', value: saved, color: 'text-amber-400', bg: 'from-amber-500/10 to-orange-500/5', border: 'border-amber-500/20' },
          { label: 'Applied', value: applied, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-teal-500/5', border: 'border-emerald-500/20' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + (i * 0.05) }}
            className={`rounded-2xl border ${s.border} bg-gradient-to-br ${s.bg} p-5 text-center backdrop-blur-sm transition-all hover:scale-[1.02]`}>
            <p className={`text-3xl font-heading font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search saved jobs by title or company..." className="pl-10 bg-background/50 border-border/50 h-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-border/50 h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-border/50 backdrop-blur-xl bg-background/95">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="saved">Saved</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Grid */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 px-6 text-center border border-border/50 rounded-2xl bg-card/30 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50 shadow-sm">
            <Bookmark className="w-8 h-8 text-muted-foreground/70" />
          </div>
          <p className="text-foreground font-semibold text-lg">No saved jobs yet</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[300px] leading-relaxed">
            {jobs.length === 0 ? "Save jobs manually or install the browser extension to start building your pipeline." : "No jobs match your current search filters."}
          </p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/3 via-transparent to-accent/3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading font-bold text-base leading-tight flex-1 pr-3 text-foreground">{job.title}</h3>
                    <button onClick={() => handleDeleteJob(job.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-4">
                    <Building2 className="w-4 h-4" />
                    <span>{job.company}</span>
                    {job.source_site && <><span className="text-border mx-1">•</span><Globe className="w-3.5 h-3.5" /><span>{job.source_site}</span></>}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${TYPE_COLORS[job.type]}`}>{job.type}</Badge>
                    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[job.status]}`}>{job.status}</Badge>
                    {job.work_mode && <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider border-border/50 bg-muted/50">{job.work_mode}</Badge>}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground font-medium mb-5">
                    {job.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
                    {job.stipend && <span className="flex items-center gap-1.5 text-emerald-400 font-bold">₹{job.stipend}</span>}
                    {job.deadline && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Due {format(new Date(job.deadline), 'MMM d')}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border/50 relative">
                  {job.status === 'saved' && (
                    <Button size="sm" className="h-9 font-semibold gradient-primary text-white border-0 flex-1 shadow-sm hover:opacity-90 transition-opacity"
                      onClick={() => handleUpdateJob(job.id, { status: 'applied' })}>
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Mark Applied
                    </Button>
                  )}
                  {job.status === 'applied' && (
                    <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md h-9 flex-1">
                      <CheckCircle2 className="w-4 h-4" /> Applied
                    </div>
                  )}
                  {job.url && (
                    <a href={job.url.startsWith('http') ? job.url : `https://${job.url}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center w-9 h-9 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-colors ml-auto border border-border/50">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Job Dialog remains the same functionally, just styled... */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-border/50 bg-background/95 backdrop-blur-xl">
          {/* ... Dialog contents ... */}
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Save a Job Posting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
             <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Job Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Frontend Developer Intern" className="mt-1.5 bg-background/50 border-border/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Company *</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Google" className="mt-1.5 bg-background/50 border-border/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1.5 bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-border/50 bg-background/95 backdrop-blur-xl">
                    {['internship', 'job', 'hackathon', 'competition'].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Job URL</Label>
                <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="mt-1.5 bg-background/50 border-border/50" />
              </div>
              {/* ... other fields ... */}
            </div>
             <Button className="w-full gradient-primary text-white border-0 mt-4 h-10 shadow-lg glow-primary" onClick={() => handleAddJob(form)} disabled={!form.title || !form.company}>
               Save Job
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}