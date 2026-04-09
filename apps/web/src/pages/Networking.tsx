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
const RELATIONSHIP_COLORS = {
  recruiter: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  peer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  mentor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  alumni: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  referral: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  other: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};
const STATUS_COLORS = {
  connected: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  following: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  met: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
};

const empty = { name: '', title: '', company: '', email: '', linkedin_url: '', platform: 'LinkedIn', relationship: 'peer', status: 'connected', notes: '', referral_potential: false, tags: [] };

// Mock data
const mockContacts = [
  { id: 1, name: 'John Smith', title: 'Recruiter', company: 'Google', email: 'john@google.com', linkedin_url: 'linkedin.com/in/johnsmith', platform: 'LinkedIn', relationship: 'recruiter', status: 'connected', notes: 'Met at tech conference', referral_potential: true },
  { id: 2, name: 'Jane Doe', title: 'Senior Engineer', company: 'Meta', email: 'jane@meta.com', linkedin_url: 'linkedin.com/in/janedoe', platform: 'LinkedIn', relationship: 'peer', status: 'connected', notes: 'Same university alumni', referral_potential: false },
  { id: 3, name: 'Alex Chen', title: 'Engineering Manager', company: 'Microsoft', email: 'alex@microsoft.com', linkedin_url: 'linkedin.com/in/alexchen', platform: 'LinkedIn', relationship: 'mentor', status: 'pending', notes: 'Interested in mentoring', referral_potential: true },
];

export default function Networking() {
  const [contacts, setContacts] = useState(mockContacts);
  const [search, setSearch] = useState('');
  const [filterRel, setFilterRel] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const isLoading = false;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold">Networking Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Track connections from LinkedIn, Unstop & more.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white border-0 glow-primary hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-2" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alex Johnson" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Senior Engineer" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Company</Label>
                  <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Google" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="alex@google.com" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Platform</Label>
                  <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['LinkedIn', 'Unstop', 'GitHub', 'Twitter', 'Email', 'Event', 'Other'].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Relationship</Label>
                  <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['recruiter', 'peer', 'mentor', 'alumni', 'referral', 'other'].map(r => (
                        <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['connected', 'pending', 'following', 'met'].map(s => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">LinkedIn URL</Label>
                  <Input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="linkedin.com/in/..." className="mt-1" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="ref" checked={form.referral_potential} onChange={e => setForm(f => ({ ...f, referral_potential: e.target.checked }))} className="rounded" />
                  <Label htmlFor="ref" className="text-xs cursor-pointer">Can provide referral</Label>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="How you met, topics discussed..." className="mt-1 h-20" />
              </div>
               <Button className="w-full gradient-primary text-white border-0" onClick={() => handleAddContact(form)} disabled={!form.name}>
                 Add Contact
               </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: contacts.length, icon: Users, gradient: 'from-violet-500/10 to-purple-500/10', text: 'text-violet-500' },
          { label: 'Recruiters', value: recruiters, icon: UserCheck, gradient: 'from-emerald-500/10 to-teal-500/10', text: 'text-emerald-500' },
          { label: 'Referral Potential', value: referrals, icon: Star, gradient: 'from-amber-500/10 to-orange-500/10', text: 'text-amber-500' },
          { label: 'Pending Response', value: pending, icon: Clock, gradient: 'from-rose-500/10 to-pink-500/10', text: 'text-rose-500' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className={`rounded-2xl border border-border/50 bg-gradient-to-br ${s.gradient} p-5 backdrop-blur-sm`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-white/60 ${s.text}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-heading font-bold ${s.text}`}>{s.value}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="pl-9" />
        </div>
        <Select value={filterRel} onValueChange={setFilterRel}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Relationship" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {['recruiter', 'peer', 'mentor', 'alumni', 'referral', 'other'].map(r => (
              <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

       {/* Contacts Grid */}
       {false ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary/50" />
          </div>
          <p className="text-muted-foreground font-medium">No contacts yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Add your first connection to start networking</p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  whileHover={{ y: -2 }}
                  className="group relative bg-card border border-border/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/3 via-transparent to-accent/3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm">
                          {contact.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-sm">{contact.name}</h3>
                          <p className="text-xs text-muted-foreground">{contact.title || contact.platform}</p>
                        </div>
                      </div>
                       <button onClick={() => handleDeleteContact(contact.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {contact.company && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                        <Building2 className="w-3 h-3" />
                        <span>{contact.company}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className={`text-[10px] border ${RELATIONSHIP_COLORS[contact.relationship]}`}>
                        {contact.relationship}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[contact.status]}`}>
                        {contact.status}
                      </Badge>
                      {contact.referral_potential && (
                        <Badge variant="outline" className="text-[10px] border border-amber-500/20 bg-amber-500/10 text-amber-600">
                          <Star className="w-2.5 h-2.5 mr-1" /> Referral
                        </Badge>
                      )}
                    </div>

                    {contact.notes && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{contact.notes}</p>
                    )}

                    <div className="flex items-center gap-2">
                      <PlatformIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      {contact.linkedin_url && (
                        <a href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          View Profile <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {contact.last_interaction && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {contact.last_interaction}
                        </span>
                      )}
                    </div>
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