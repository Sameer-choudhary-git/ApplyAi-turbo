import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import MobileNav from "./MobileNav";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const sidebarWidth = collapsed ? 84 : 264;

  return (
    <div className="noise-overlay relative min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="grid-surface pointer-events-none absolute inset-x-0 top-0 h-[34rem] opacity-50" />
      <div className="pointer-events-none absolute -left-40 top-12 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10rem] top-64 h-96 w-96 rounded-full bg-[hsl(174_67%_68%_/_0.07)] blur-3xl" />

      <div className="relative z-20 hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <MobileNav />

      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 hidden min-h-screen md:block"
      >
        <div className="mx-auto max-w-[1480px] px-5 py-6 lg:px-9 lg:py-9">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>

      <main className="relative z-10 min-h-screen pb-24 md:hidden">
        <div className="px-4 pb-4 pt-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
