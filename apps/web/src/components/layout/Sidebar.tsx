import type { Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
};

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Workspace",
    items: [
      { path: "/", icon: LayoutDashboard, label: "Dashboard" },
      { path: "/applications", icon: BriefcaseBusiness, label: "Applications" },
      { path: "/saved-jobs", icon: Bookmark, label: "Saved jobs" },
      { path: "/job-skill", icon: Sparkles, label: "Job Skill" },
      { path: "/networking", icon: Users, label: "Networking" },
    ],
  },
  {
    label: "Planning",
    items: [
      { path: "/schedule", icon: CalendarDays, label: "Schedule" },
      { path: "/tasks", icon: ListTodo, label: "Tasks" },
    ],
  },
  {
    label: "Insights",
    items: [{ path: "/analytics", icon: BarChart3, label: "Analytics" }],
  },
  {
    label: "System",
    items: [
      { path: "/preferences", icon: Settings2, label: "Preferences" },
      { path: "/admin/jobs", icon: ClipboardCheck, label: "Job admin" },
      { path: "/admin/subscriptions", icon: KeyRound, label: "Access codes" },
    ],
  },
];

function LogoMark() {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-primary/30 bg-primary/12 shadow-[0_12px_30px_-18px_hsl(var(--primary)/.75)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/.34),transparent_55%)]" />
      <Sparkles className="relative h-[18px] w-[18px] text-primary" strokeWidth={2.2} />
    </div>
  );
}

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
        collapsed ? "justify-center px-0" : "",
        isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/58 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {isActive && (
        <motion.span layoutId="sidebar-active-pill" className="absolute inset-0 rounded-xl bg-sidebar-accent shadow-[inset_0_1px_0_hsl(var(--foreground)/.04)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
      )}
      <Icon className={cn("relative z-10 h-[18px] w-[18px] shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/42 group-hover:text-sidebar-foreground/75")} strokeWidth={isActive ? 2.2 : 1.8} />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} transition={{ duration: 0.16 }} className="relative z-10 truncate">{item.label}</motion.span>
        )}
      </AnimatePresence>
      {isActive && !collapsed && <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  );
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  return (
    <motion.aside initial={false} animate={{ width: collapsed ? 84 : 264 }} transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }} className="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar/92 px-3 py-4 shadow-[18px_0_70px_-52px_hsl(222_35%_3%/.95)] backdrop-blur-2xl">
      <div className={cn("flex items-center gap-3 px-2", collapsed ? "justify-center" : "")}>
        <LogoMark />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.16 }} className="min-w-0">
              <p className="font-heading text-[15px] font-extrabold tracking-[-0.03em] text-sidebar-foreground">Apply AI</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-sidebar-foreground/42">Career command center</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={cn("mt-8 flex-1 overflow-y-auto pb-4", collapsed ? "px-0" : "px-1", "scrollbar-subtle")}>
        {groups.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/32">{group.label}</p>}
            <div className="space-y-1">
              {group.items.map((item) => <SidebarItem key={item.path} item={item} collapsed={collapsed} />)}
            </div>
          </div>
        ))}
      </div>

      <div className={cn("border-t border-sidebar-border pt-3", collapsed ? "px-0" : "px-1")}>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="mb-3 rounded-2xl border border-primary/15 bg-primary/[0.07] p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-sidebar-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><Activity className="h-3.5 w-3.5" /></span>Workspace ready</div>
              <p className="mt-2 text-[11px] leading-5 text-sidebar-foreground/45">Your applications, follow-ups, and next steps in one place.</p>
              <Link to="/analytics" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-sidebar-foreground">View insights <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </motion.div>
          )}
        </AnimatePresence>
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className={cn("flex h-10 w-full items-center rounded-xl text-xs font-semibold text-sidebar-foreground/45 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground", collapsed ? "justify-center" : "gap-2 px-3")}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse sidebar</span></>}
        </button>
      </div>
    </motion.aside>
  );
}
