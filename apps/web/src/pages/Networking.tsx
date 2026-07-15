import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Linkedin,
  Github,
  Mail,
  Star,
  Search,
  Building2,
  ExternalLink,
  Trash2,
  UserCheck,
  Clock,
  Globe,
  Twitter,
  X,
  Loader2,
  AlertCircle,
  Pin,
  PinOff,
} from "lucide-react";
import {
  Contact,
  ContactStats,
  ContactInput,
  listContacts,
  getContactStats,
  createContact,
  deleteContact,
  togglePinContact,
} from "@/api/networking";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  LinkedIn: Linkedin,
  GitHub: Github,
  Twitter: Twitter,
  Email: Mail,
  Unstop: Globe,
  Event: Globe,
  Other: Globe,
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  recruiter: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  peer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  mentor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  alumni: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  referral: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  other: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  connected: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  following: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  met: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const PINNED_FILTER = "__pinned__";

const emptyForm: ContactInput = {
  name: "",
  title: "",
  company: "",
  email: "",
  profile_url: "",
  platform: "LinkedIn",
  relationships: ["peer"],
  status: "connected",
  notes: "",
  referral_potential: false,
  tags: [],
};

export default function Networking() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats>({
    total: 0,
    recruiters: 0,
    referralPotential: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterRel, setFilterRel] = useState("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ContactInput>(emptyForm);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(
    async (searchTerm: string, relationship: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listContacts({
          search: searchTerm,
          relationship: relationship === PINNED_FILTER ? "all" : relationship,
        });
        setContacts(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load contacts",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadStats = useCallback(async () => {
    try {
      const data = await getContactStats();
      setStats(data);
    } catch {
      // stats failure shouldn't block the page
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadContacts("", "all");
    loadStats();
  }, [loadContacts, loadStats]);

  // Debounced search/filter reload
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadContacts(search, filterRel);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, filterRel, loadContacts]);

  const handleAddContact = async (newContact: ContactInput) => {
    if (!newContact.name?.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createContact(newContact);
      setContacts((prev) => [created, ...prev]);
      setOpen(false);
      setForm(emptyForm);
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    const prev = contacts;
    setContacts((c) => c.filter((ct) => ct.id !== id)); // optimistic
    try {
      await deleteContact(id);
      loadStats();
    } catch (err) {
      setContacts(prev); // revert on failure
      setError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  };

  const handleTogglePin = async (id: string) => {
    const prevContacts = contacts;
    // optimistic flip + re-sort (pinned first)
    setContacts((cs) => {
      const updated = cs.map((ct) =>
        ct.id === id ? { ...ct, pinned: !ct.pinned } : ct,
      );
      return [...updated].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    });
    try {
      await togglePinContact(id);
    } catch (err) {
      setContacts(prevContacts); // revert on failure
      setError(err instanceof Error ? err.message : "Failed to pin contact");
    }
  };

  const getUrlPlaceholder = (platform: string) => {
    switch (platform) {
      case "LinkedIn":
        return "linkedin.com/in/...";
      case "GitHub":
        return "github.com/...";
      case "Twitter":
        return "twitter.com/...";
      default:
        return "https://...";
    }
  };

  const visibleContacts = pinnedOnly
    ? contacts.filter((c) => c.pinned)
    : contacts;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary shadow-lg flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">
              Networking Hub
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track connections, recruiters, and referrals.
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white border-0 glow-primary hover:opacity-90 transition-all h-10 px-5 shadow-lg active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> Add Contact
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-xl p-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden [&>button]:hidden fixed left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2">
            <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-border/50 space-y-0 bg-background/50">
              <DialogTitle className="font-heading text-xl">
                Add New Contact
              </DialogTitle>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogHeader>

            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/80 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="space-y-5 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Alex Johnson"
                      className="mt-1.5 bg-background border-border/50 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Title
                    </Label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="Senior Engineer"
                      className="mt-1.5 bg-background border-border/50 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Company
                    </Label>
                    <Input
                      value={form.company}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, company: e.target.value }))
                      }
                      placeholder="Google"
                      className="mt-1.5 bg-background border-border/50 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="alex@company.com"
                      className="mt-1.5 bg-background border-border/50 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Platform
                    </Label>
                    <Select
                      value={form.platform}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, platform: v }))
                      }
                    >
                      <SelectTrigger className="mt-1.5 bg-background border-border/50 focus:ring-1 focus:ring-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={4}
                        className="z-[100] w-[var(--radix-select-trigger-width)] bg-background border-border/50 shadow-xl"
                      >
                        {[
                          "LinkedIn",
                          "Unstop",
                          "GitHub",
                          "Twitter",
                          "Email",
                          "Event",
                          "Other",
                        ].map((p) => (
                          <SelectItem key={p} value={p}>
                            <span className="ml-6 block">{p}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Status
                    </Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, status: v }))
                      }
                    >
                      <SelectTrigger className="mt-1.5 bg-background border-border/50 focus:ring-1 focus:ring-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={4}
                        className="z-[100] w-[var(--radix-select-trigger-width)] bg-background border-border/50 shadow-xl"
                      >
                        {["connected", "pending", "following", "met"].map(
                          (s) => (
                            <SelectItem key={s} value={s}>
                              <span className="ml-6 block">
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </span>
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      {form.platform} URL
                    </Label>
                    <Input
                      value={form.profile_url}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, profile_url: e.target.value }))
                      }
                      placeholder={getUrlPlaceholder(
                        form.platform || "LinkedIn",
                      )}
                      className="mt-1.5 bg-background border-border/50 focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      Relationships (Select multiple)
                    </Label>
                    <Select
                      value="placeholder"
                      onValueChange={(v) => {
                        if (
                          v !== "placeholder" &&
                          !form.relationships?.includes(v)
                        ) {
                          setForm((f) => ({
                            ...f,
                            relationships: [...(f.relationships || []), v],
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1.5 bg-background border-border/50 focus:ring-1 focus:ring-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={4}
                        className="z-[100] w-[var(--radix-select-trigger-width)] bg-background border-border/50 shadow-xl"
                      >
                        <SelectItem value="placeholder" className="hidden">
                          Add relationship...
                        </SelectItem>
                        {[
                          "recruiter",
                          "peer",
                          "mentor",
                          "alumni",
                          "referral",
                          "other",
                        ].map((r) => (
                          <SelectItem
                            key={r}
                            value={r}
                            disabled={form.relationships?.includes(r)}
                          >
                            <span className="ml-6 block">
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {form.relationships && form.relationships.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {form.relationships.map((rel) => (
                          <Badge
                            key={rel}
                            variant="outline"
                            className={`text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${
                              RELATIONSHIP_COLORS[rel] ||
                              RELATIONSHIP_COLORS.other
                            }`}
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                relationships: (f.relationships || []).filter(
                                  (r) => r !== rel,
                                ),
                              }))
                            }
                            title="Click to remove"
                          >
                            {rel} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="col-span-1 sm:col-span-2 flex items-center gap-3 mt-1 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                    <input
                      type="checkbox"
                      id="ref"
                      checked={!!form.referral_potential}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          referral_potential: e.target.checked,
                        }))
                      }
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <Label
                      htmlFor="ref"
                      className="text-sm font-medium text-amber-500 cursor-pointer select-none"
                    >
                      This contact can provide a referral
                    </Label>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Notes
                  </Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="How you met, topics discussed, next steps..."
                    className="mt-1.5 h-24 bg-background border-border/50 resize-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                  </p>
                )}

                <Button
                  className="w-full gradient-primary text-white border-0 mt-6 glow-primary hover:opacity-90 transition-all h-11"
                  onClick={() => handleAddContact(form)}
                  disabled={!form.name?.trim() || submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add Contact"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Contacts",
            value: stats.total,
            icon: Users,
            color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
          },
          {
            label: "Recruiters",
            value: stats.recruiters,
            icon: UserCheck,
            color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          },
          {
            label: "Referral Potential",
            value: stats.referralPotential,
            icon: Star,
            color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          },
          {
            label: "Pending Response",
            value: stats.pending,
            icon: Clock,
            color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:bg-card/80 hover:shadow-md cursor-default">
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl border ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-2xl font-heading font-bold mt-0.5 text-foreground">
                    {s.value}
                  </p>
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
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, or role..."
            className="pl-10 bg-background border-border/50 h-10 focus:border-primary/50 transition-colors"
          />
        </div>
        <Select value={filterRel} onValueChange={setFilterRel}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background border-border/50 h-10">
            <SelectValue placeholder="Filter Relationship" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            sideOffset={4}
            className="z-[100] w-[var(--radix-select-trigger-width)] bg-background border-border/50 shadow-xl"
          >
            <SelectItem value="all">
              <span className="ml-6 block">All Relationships</span>
            </SelectItem>
            {["recruiter", "peer", "mentor", "alumni", "referral", "other"].map(
              (r) => (
                <SelectItem key={r} value={r}>
                  <span className="ml-6 block">
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </span>
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={pinnedOnly ? "default" : "outline"}
          onClick={() => setPinnedOnly((v) => !v)}
          className={`h-10 px-4 flex-shrink-0 ${
            pinnedOnly
              ? "gradient-primary text-white border-0"
              : "bg-background border-border/50 text-muted-foreground hover:text-foreground"
          }`}
          title={pinnedOnly ? "Showing pinned only" : "Show pinned only"}
        >
          {pinnedOnly ? (
            <Pin className="w-4 h-4 mr-1.5 fill-current" />
          ) : (
            <Pin className="w-4 h-4 mr-1.5" />
          )}
          Pinned
        </Button>
      </div>

      {error && !open && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Contacts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : visibleContacts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-border rounded-2xl bg-card/30 backdrop-blur-sm"
        >
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50 shadow-sm">
            {pinnedOnly ? (
              <Pin className="w-8 h-8 text-muted-foreground/70" />
            ) : (
              <Users className="w-8 h-8 text-muted-foreground/70" />
            )}
          </div>
          <p className="text-foreground font-semibold text-lg">
            {pinnedOnly ? "No pinned contacts" : "No contacts found"}
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[300px] leading-relaxed">
            {pinnedOnly
              ? "Pin your most important contacts to see them here."
              : search || filterRel !== "all"
                ? "No contacts match your current search filters."
                : "Add your first connection to start building your network."}
          </p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {visibleContacts.map((contact, i) => {
              const PlatformIcon = PLATFORM_ICONS[contact.platform] || Globe;
              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className={`group relative backdrop-blur-sm rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between ${
                    contact.pinned
                      ? "bg-primary/5 border border-primary/30 shadow-md shadow-primary/10"
                      : "bg-card/50 border border-border/50 hover:border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-inner">
                          {contact.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-base text-foreground leading-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {contact.name}
                            {contact.pinned && (
                              <Pin className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                            )}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {contact.title || contact.platform}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleTogglePin(contact.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            contact.pinned
                              ? "text-primary hover:bg-primary/10 opacity-100"
                              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                          }`}
                          title={contact.pinned ? "Unpin contact" : "Pin contact"}
                        >
                          {contact.pinned ? (
                            <PinOff className="w-4 h-4" />
                          ) : (
                            <Pin className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-muted-foreground hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-lg"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {contact.company && (
                      <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium mb-4 bg-muted/30 w-fit px-2.5 py-1 rounded-md border border-border/50">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{contact.company}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {contact.relationships?.map((rel) => (
                        <Badge
                          key={rel}
                          variant="outline"
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            RELATIONSHIP_COLORS[rel] ||
                            RELATIONSHIP_COLORS.other
                          }`}
                        >
                          {rel}
                        </Badge>
                      ))}

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[contact.status]}`}
                      >
                        {contact.status}
                      </Badge>

                      {contact.referralPotential && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold uppercase tracking-wider border border-amber-500/20 bg-amber-500/10 text-amber-400"
                        >
                          <Star className="w-2.5 h-2.5 mr-1" /> Referral
                        </Badge>
                      )}
                    </div>

                    {contact.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                        {contact.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-border/50 mt-auto">
                    <PlatformIcon className="w-4 h-4 text-muted-foreground" />
                    {contact.profileUrl ? (
                      <a
                        href={
                          contact.profileUrl.startsWith("http")
                            ? contact.profileUrl
                            : `https://${contact.profileUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-1.5 ml-1"
                      >
                        View Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground ml-1">
                        No URL provided
                      </span>
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