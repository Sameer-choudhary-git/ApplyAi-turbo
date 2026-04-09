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

const TYPE_COLORS = {
  internship: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  job: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  hackathon: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  competition: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};
const STATUS_COLORS = {
  saved: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  applied: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  ignored: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const empty = { title: '', company: '', url: '', location: '', work_mode: '', stipend: '', type: 'internship', source_site: '', notes: '', status: 'saved', description: '', deadline: '' };

// Mock data
const mockJobs = [
  { id: 1, title: 'Frontend Developer Intern', company: 'Google', url: 'https://google.com/careers', location: 'Mountain View, CA', work_mode: 'On-site', stipend: '50,000', type: 'internship', source_site: 'LinkedIn', notes: 'Great opportunity', status: 'saved', deadline: '2024-12-31' },
  { id: 2, title: 'Backend Engineer', company: 'Meta', url: 'https://meta.com/careers', location: 'Remote', work_mode: 'Remote', stipend: '75,000', type: 'job', source_site: 'Indeed', notes: 'Interested', status: 'applied', deadline: '2024-11-30' },
  { id: 3, title: 'Full Stack Hackathon', company: 'Unstop', url: 'https://unstop.com', location: 'Online', work_mode: 'Remote', stipend: '10,000', type: 'hackathon', source_site: 'Unstop', notes: 'Fun project', status: 'saved', deadline: '2024-10-15' },
];

export default function SavedJobs() {
  const [jobs, setJobs] = useState(mockJobs);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const isLoading = false;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold">Job Saver</h1>
          <p className="text-muted-foreground text-sm mt-1">Bookmark jobs from any platform manually or via extension.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 text-sm" onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}>
            <Puzzle className="w-4 h-4" /> Get Extension
          </Button>
          <Button className="gradient-primary text-white border-0 glow-primary hover:opacity-90" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Save Job
          </Button>
        </div>
      </div>

      {/* Extension CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/8 via-violet-500/5 to-accent/8 p-5"
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg glow-primary flex-shrink-0">
            <Puzzle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-bold">Browser Extension (Coming Soon)</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              1-click save any job from LinkedIn, Unstop, Internshala or any website directly to your tracker.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {['LinkedIn', 'Unstop', 'Internshala', 'Indeed', 'AngelList', 'Any site'].map(s => (
                <Badge key={s} variant="outline" className="text-[10px] border-primary/20 text-primary/80">{s}</Badge>
              ))}
            </div>
          </div>
          <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 flex-shrink-0 hidden sm:flex">
            Notify Me
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Saved', value: jobs.length, color: 'text-violet-500', bg: 'from-violet-500/10 to-purple-500/10' },
          { label: 'To Apply', value: saved, color: 'text-amber-500', bg: 'from-amber-500/10 to-orange-500/10' },
          { label: 'Applied', value: applied, color: 'text-emerald-500', bg: 'from-emerald-500/10 to-teal-500/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`rounded-2xl border border-border/50 bg-gradient-to-br ${s.bg} p-4 text-center`}>
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search saved jobs..." className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="saved">Saved</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>
      </div>

       {/* Jobs Grid */}
       {false ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-44 rounded-2xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8 text-primary/50" />
          </div>
          <p className="text-muted-foreground font-medium">No saved jobs yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Save jobs manually or install the browser extension</p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                className="group relative bg-card border border-border/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/3 via-transparent to-accent/3 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-heading font-bold text-sm leading-snug flex-1 pr-2">{job.title}</h3>
                     <button onClick={() => handleDeleteJob(job.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Building2 className="w-3 h-3" />
                    <span>{job.company}</span>
                    {job.source_site && <><span className="text-border">·</span><Globe className="w-3 h-3" /><span>{job.source_site}</span></>}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className={`text-[10px] border ${TYPE_COLORS[job.type]}`}>{job.type}</Badge>
                    <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[job.status]}`}>{job.status}</Badge>
                    {job.work_mode && <Badge variant="outline" className="text-[10px] border-border/50">{job.work_mode}</Badge>}
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-3">
                    {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                    {job.stipend && <span className="flex items-center gap-1 text-emerald-600 font-medium">₹{job.stipend}</span>}
                    {job.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due {job.deadline}</span>}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                     {job.status === 'saved' && (
                       <Button size="sm" className="h-7 text-xs gradient-primary text-white border-0 flex-1"
                         onClick={() => handleUpdateJob(job.id, { status: 'applied' })}>
                         <Send className="w-3 h-3 mr-1" /> Mark Applied
                       </Button>
                     )}
                    {job.status === 'applied' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 flex-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                      </div>
                    )}
                    {job.url && (
                      <a href={job.url.startsWith('http') ? job.url : `https://${job.url}`} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors ml-auto">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Job Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Save a Job Posting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Job Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Frontend Developer Intern" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Company *</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Google" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['internship', 'job', 'hackathon', 'competition'].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Job URL</Label>
                <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Remote" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Source Site</Label>
                <Input value={form.source_site} onChange={e => setForm(f => ({ ...f, source_site: e.target.value }))} placeholder="LinkedIn" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Stipend</Label>
                <Input value={form.stipend} onChange={e => setForm(f => ({ ...f, stipend: e.target.value }))} placeholder="₹50,000/mo" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Why interested, requirements..." className="mt-1 h-20" />
            </div>
             <Button className="w-full gradient-primary text-white border-0" onClick={() => handleAddJob(form)} disabled={!form.title || !form.company}>
               Save Job
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}