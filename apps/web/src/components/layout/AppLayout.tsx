import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import MobileNav from "./MobileNav";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const sidebarWidth = collapsed ? 88 : 288;

  return (
    <div className="noise-overlay relative min-h-screen overflow-x-clip bg-background font-body">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute left-[17%] top-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="grid-surface absolute inset-x-0 top-0 h-[32rem] opacity-40" />
      </div>

      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <MobileNav />

      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="hidden min-h-screen md:block"
      >
        <div className="mx-auto max-w-[1540px] px-8 py-8 lg:px-10 lg:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>

      <main className="min-h-screen pb-24 md:hidden">
        <div className="px-4 pb-4 pt-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
