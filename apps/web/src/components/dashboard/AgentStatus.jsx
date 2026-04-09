import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AgentStatus({ profile }) {
  const isActive = profile?.preferences?.auto_apply !== false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 p-5" style={{ background: 'linear-gradient(135deg, hsl(234,36%,6%) 0%, hsl(258,30%,10%) 100%)' }}>
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-4 -top-4 w-20 h-20 rounded-full bg-accent/10 blur-xl pointer-events-none" />

        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-sidebar ${isActive ? 'bg-emerald-400' : 'bg-muted-foreground'}`}
              />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-sidebar-foreground">AI Agent</h3>
              <Badge className={isActive
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold'
                : 'text-muted-foreground text-[10px]'
              } variant="outline">
                {isActive ? '● Active' : '○ Paused'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="relative space-y-3">
          {[
            { icon: Zap, color: 'text-accent', text: `${profile?.preferences?.daily_apply_limit || 10} applications/day` },
            { icon: Shield, color: 'text-primary', text: `${(profile?.preferences?.preferred_platforms || []).length || 0} platforms connected` },
            { icon: Clock, color: 'text-amber-400', text: 'Next run in ~2 hours' },
          ].map(({ icon: Icon, color, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-xs text-sidebar-foreground/60">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}