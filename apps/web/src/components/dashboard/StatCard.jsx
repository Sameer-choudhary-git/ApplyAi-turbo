import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const styles = {
  primary: {
    wrap: 'border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-600/5',
    icon: 'bg-violet-500/15 text-violet-400',
    value: 'text-gradient',
  },
  accent: {
    wrap: 'border-teal-400/20 bg-gradient-to-br from-teal-400/10 to-cyan-500/5',
    icon: 'bg-teal-400/15 text-teal-400',
    value: 'text-teal-300',
  },
  warning: {
    wrap: 'border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-orange-500/5',
    icon: 'bg-amber-400/15 text-amber-400',
    value: 'text-amber-300',
  },
  destructive: {
    wrap: 'border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-pink-600/5',
    icon: 'bg-rose-500/15 text-rose-400',
    value: 'text-rose-300',
  },
  blue: {
    wrap: 'border-sky-400/20 bg-gradient-to-br from-sky-400/10 to-blue-500/5',
    icon: 'bg-sky-400/15 text-sky-400',
    value: 'text-sky-300',
  },
};

export default function StatCard({ icon: Icon, label, value, sublabel, color = 'primary', delay = 0 }) {
  const s = styles[color] || styles.primary;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className={cn('rounded-2xl border p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 cursor-default relative overflow-hidden', s.wrap)}>
        {/* subtle shimmer top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{label}</p>
            <p className={cn('text-3xl font-heading font-bold mt-2', s.value)}>{value}</p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1.5">{sublabel}</p>}
          </div>
          <div className={cn('p-3 rounded-xl', s.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}