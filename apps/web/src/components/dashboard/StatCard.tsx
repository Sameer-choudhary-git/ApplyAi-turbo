import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const styles = {
  primary: {
    wrap: 'border-violet-500/20 bg-violet-500/5',
    icon: 'bg-violet-500/15 text-violet-400',
    value: 'text-foreground', // Keeping value white/foreground for better readability
  },
  accent: {
    wrap: 'border-teal-400/20 bg-teal-400/5',
    icon: 'bg-teal-400/15 text-teal-400',
    value: 'text-foreground',
  },
  warning: {
    wrap: 'border-amber-400/20 bg-amber-400/5',
    icon: 'bg-amber-400/15 text-amber-400',
    value: 'text-foreground',
  },
  destructive: {
    wrap: 'border-rose-500/20 bg-rose-500/5',
    icon: 'bg-rose-500/15 text-rose-400',
    value: 'text-foreground',
  },
  blue: {
    wrap: 'border-sky-400/20 bg-sky-400/5',
    icon: 'bg-sky-400/15 text-sky-400',
    value: 'text-foreground',
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
      className="h-full"
    >
      <div className={cn(
        'h-full rounded-2xl border p-5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-default relative overflow-hidden backdrop-blur-sm', 
        s.wrap
      )}>
        {/* Subtle top shimmer */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="flex items-start justify-between">
          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{label}</p>
              <p className={cn('text-3xl font-heading font-bold mt-2.5', s.value)}>{value}</p>
            </div>
            {sublabel && <p className="text-xs text-muted-foreground mt-2 font-medium">{sublabel}</p>}
          </div>
          <div className={cn('p-3 rounded-xl flex-shrink-0', s.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}