import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users, Plus, Linkedin, Github, Mail, Star, Search,
  Building2, ExternalLink, Trash2, UserCheck, Clock, Globe
} from 'lucide-react';

const PLATFORM_ICONS = { LinkedIn: Linkedin, GitHub: Github, Email: Mail, Other: Globe };

// Dark-mode optimized colors (using 400 for text readability)
const RELATIONSHIP_COLORS = {
  recruiter: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  peer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  mentor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  alumni: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  referral: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_COLORS = {
  connected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  following: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  met: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

const empty = { name: '', title: '', company: '', email: '', linkedin_url: '', platform: 'LinkedIn', relationship: 'peer', status: 'connected', notes: '', referral_potential: false, tags: [] };

const mockContacts = [
  { id: 1, name: 'John Smith', title: 'Technical Recruiter', company: 'Google', email: 'john@google.com', linkedin_url: 'linkedin.com/in/johnsmith', platform: 'LinkedIn', relationship: 'recruiter', status: 'connected', notes: 'Met at React Summit 2024.', referral_potential: true },
  { id: 2, name: 'Jane Doe', title: 'Senior Engineer', company: 'Meta', email: 'jane@meta.com', linkedin_url: 'linkedin.com/in/janedoe', platform: 'LinkedIn', relationship: 'peer', status: 'connected', notes: 'Same university alumni group.', referral_potential: false },
  { id: 3, name: 'Alex Chen', title: 'Engineering Manager', company: 'Microsoft', email: 'alex@microsoft.com', linkedin_url: 'linkedin.com/in/alexchen', platform: 'LinkedIn', relationship: 'mentor', status: 'pending', notes: 'Reached out for portfolio review.', referral_potential: true },
];

export default function Networking() {
  const [contacts, setContacts] = useState(mockContacts);
  const [search, setSearch] = useState('');
  const [filterRel, setFilterRel] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const handleAddContact = (newContact: typeof empty) => {
    setContacts([{ ...newContact, id: Math.max(...contacts.map(c => c.id), 0) + 1 }, ...contacts]);
    setOpen(false);
    setForm(empty);
  };

  const handleDeleteContact = (id: number) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q);
    const matchRel = filterRel === 'all' || c.relationship === filterRel;
    return matchSearch && matchRel;
  });

  const recruiters = contacts.filter(c => c.relationship === 'recruiter').length;
  const referrals = contacts.filter(c => c.referral_potential).length;
  const pending = contacts.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">Networking Hub</h1>
            <p className="text-muted-foreground text-sm mt-1">Track connections, recruiters, and referrals.</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white border-0 glow-primary hover:opacity-90 transition-opacity h-10 px-5 shadow-lg">
              <Plus className="w-4 h-4 mr-2" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg border-border/50 bg-background/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alex Johnson" className="mt-1.5 bg-background/50 border-border/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Title</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Senior Engineer" className="mt-1.5 bg-background/50 border-border/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Company</Label>
                  <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Google" className="mt-1.5 bg-background/50 border-border/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email</Label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="alex@company.com" className="mt-1.5 bg-background/50 border-border/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Platform</Label>
                  <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                    <SelectTrigger className="mt-1.5 bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['LinkedIn', 'Unstop', 'GitHub', 'Twitter', 'Email', 'Event', 'Other'].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Relationship</Label>
                  <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                    <SelectTrigger className="mt-1.5 bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['recruiter', 'peer', 'mentor', 'alumni', 'referral', 'other'].map(r => (
                        <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1.5 bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['connected', 'pending', 'following', 'met'].map(s => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">LinkedIn URL</Label>
                  <Input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="linkedin.com/in/..." className="mt-1.5 bg-background/50 border-border/50" />
                </div>
                <div className="col-span-2 flex items-center gap-2 mt-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <input type="checkbox" id="ref" checked={form.referral_potential} onChange={e => setForm(f => ({ ...f, referral_potential: e.target.checked }))} className="rounded accent-amber-500 w-4 h-4 cursor-pointer" />
                  <Label htmlFor="ref" className="text-sm font-medium text-amber-400 cursor-pointer">This contact can provide a referral</Label>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="How you met, topics discussed..." className="mt-1.5 h-20 bg-background/50 border-border/50" />
              </div>
               <Button className="w-full gradient-primary text-white border-0 mt-4 glow-primary" onClick={() => handleAddContact(form)} disabled={!form.name}>
                 Add Contact
               </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: contacts.length, icon: Users, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
          { label: 'Recruiters', value: recruiters, icon: UserCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Referral Potential', value: referrals, icon: Star, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
          { label: 'Pending Response', value: pending, icon: Clock, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:bg-card/80">
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl border ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-heading font-bold mt-0.5 text-foreground">{s.value}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, company, or role..." className="pl-10 bg-background/50 border-border/50 h-10" />
        </div>
        <Select value={filterRel} onValueChange={setFilterRel}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-border/50 h-10">
            <SelectValue placeholder="Relationship" />
          </SelectTrigger>
          <SelectContent className="border-border/50 backdrop-blur-xl bg-background/95">
            <SelectItem value="all">All Relationships</SelectItem>
            {['recruiter', 'peer', 'mentor', 'alumni', 'referral', 'other'].map(r => (
              <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Grid */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 px-6 text-center border border-border/50 rounded-2xl bg-card/30 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50 shadow-sm">
            <Users className="w-8 h-8 text-muted-foreground/70" />
          </div>
          <p className="text-foreground font-semibold text-lg">No contacts found</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[300px] leading-relaxed">
            {contacts.length === 0 ? "Add your first connection to start building your network." : "No contacts match your current search filters."}
          </p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((contact, i) => {
              const PlatformIcon = PLATFORM_ICONS[contact.platform] || Globe;
              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -4 }}
                  className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-inner">
                          {contact.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-base text-foreground leading-tight">{contact.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{contact.title || contact.platform}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteContact(contact.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {contact.company && (
                      <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium mb-4">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{contact.company}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${RELATIONSHIP_COLORS[contact.relationship]}`}>
                        {contact.relationship}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[contact.status]}`}>
                        {contact.status}
                      </Badge>
                      {contact.referral_potential && (
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider border border-amber-500/20 bg-amber-500/10 text-amber-400">
                          <Star className="w-2.5 h-2.5 mr-1" /> Referral
                        </Badge>
                      )}
                    </div>

                    {contact.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">{contact.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                    <PlatformIcon className="w-4 h-4 text-muted-foreground" />
                    {contact.linkedin_url && (
                      <a href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-1.5 ml-1">
                        View Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}