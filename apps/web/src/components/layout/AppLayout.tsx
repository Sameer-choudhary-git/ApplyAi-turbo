import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { motion } from 'framer-motion';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background font-body" style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, hsla(258,92%,68%,0.08) 0%, transparent 60%)' }}>
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <MobileNav />
      <motion.main
        animate={{ marginLeft: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:block min-h-screen"
      >
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </motion.main>
      <main className="md:hidden min-h-screen pb-20">
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}