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
      { path: "/networking", icon: Users, label: "Networking" },
    ],
  },
  {
    label: "Execution",
    items: [
      { path: "/schedule", icon: CalendarDays, label: "Schedule" },
      { path: "/tasks", icon: ListTodo, label: "Tasks" },
    ],
  },
  {
    label: "Insights",
    items: [
      { path: "/analytics", icon: BarChart3, label: "Analytics" },
      { path: "/preferences", icon: Settings2, label: "Preferences" },
    ],
  },
];

function LogoMark() {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-primary text-primary-foreground shadow-[0_10px_30px_-12px_hsl(var(--primary))]">
      <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/30 blur-md" />
      <Sparkles className="relative h-[18px] w-[18px]" strokeWidth={2.5} />
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 88 : 288 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-sidebar-border/80 bg-sidebar/95 px-3 py-4 backdrop-blur-2xl md:flex"
    >
      <div className={cn("flex items-center gap-3 px-2", collapsed ? "justify-center" : "justify-between")}>
        <Link to="/" aria-label="Apply AI home" className="group flex min-w-0 items-center gap-3">
          <LogoMark />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0, x: -6 }}
                animate={{ opacity: 1, width: "auto", x: 0 }}
                exit={{ opacity: 0, width: 0, x: -6 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 overflow-hidden whitespace-nowrap"
              >
                <p className="font-heading text-[15px] font-extrabold tracking-tight text-sidebar-accent-foreground">Apply AI</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">Career OS</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse navigation"
            className="rounded-lg p-2 text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="my-6 h-px bg-sidebar-border/80" />

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-1" aria-label="Primary navigation">
        {groups.map((group) => (
          <div key={group.label}>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/35"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
                      collapsed && "justify-center px-0",
                      active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/62 hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-sidebar-accent shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.04)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all", active ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-12px_hsl(var(--primary))]" : "bg-transparent text-sidebar-foreground/55 group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground")}>
                      <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.4 : 2} />
                    </span>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0, x: -4 }}
                          animate={{ opacity: 1, width: "auto", x: 0 }}
                          exit={{ opacity: 0, width: 0, x: -4 }}
                          transition={{ duration: 0.18 }}
                          className="relative z-10 min-w-0 flex-1 overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && active && <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-3 mt-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-sidebar-accent/30 to-accent/10 p-3.5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
                Live agent
              </span>
              <Activity className="h-4 w-4 text-primary/60" />
            </div>
            <p className="text-sm font-semibold text-sidebar-accent-foreground">Career copilot is online</p>
            <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/55">Matching roles and keeping your next move organized.</p>
            <Link to="/preferences" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80">
              Tune your strategy <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-sidebar-border/80 pt-3">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand navigation"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-xs font-bold text-primary-foreground">AI</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-sidebar-accent-foreground">Your workspace</p>
              <p className="truncate text-[11px] text-sidebar-foreground/45">Personal career hub</p>
            </div>
            <ClipboardCheck className="h-4 w-4 text-sidebar-foreground/35" />
          </div>
        )}
      </div>
    </motion.aside>
  );
}
