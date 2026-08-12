import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/applications", icon: BriefcaseBusiness, label: "Apply" },
  { path: "/networking", icon: Users, label: "Network" },
  { path: "/schedule", icon: CalendarDays, label: "Schedule" },
  { path: "/tasks", icon: ListTodo, label: "Tasks" },
];

export default function MobileNav() {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-border/80 bg-background/85 p-1.5 shadow-[0_18px_50px_-22px_hsl(222_45%_2%_/_0.95)] backdrop-blur-2xl md:hidden" aria-label="Mobile navigation">
      <div className="grid grid-cols-5 gap-1">
        {mobileItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex h-6 items-center justify-center">
                <Icon className={cn("h-[18px] w-[18px] transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
              </span>
              <span className="relative z-10">{item.label}</span>
              {active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
