import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  Search,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/applications", icon: BriefcaseBusiness, label: "Apply" },
  { path: "/greenhouse", icon: Search, label: "Greenhouse" },

  { path: "/networking", icon: Users, label: "Network" },
  { path: "/schedule", icon: CalendarDays, label: "Schedule" },
  { path: "/tasks", icon: ListTodo, label: "Tasks" },
];

export default function MobileNav() {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-50 rounded-[22px] border border-border/90 bg-sidebar/94 p-1.5 shadow-[0_18px_50px_-22px_hsl(222_45%_2%/.95)] backdrop-blur-2xl md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-6 gap-1">
        {mobileItems.map(({ path, icon: Icon, label }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[17px] px-1 text-[10px] font-bold",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/45 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active-pill"
                  className="absolute inset-0 rounded-[17px] bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-[18px] w-[18px]",
                  active ? "text-primary" : "text-sidebar-foreground/45",
                )}
                strokeWidth={active ? 2.25 : 1.8}
              />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
