import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, MessageSquare, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DailySummaryCard({ summary }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20" style={{ background: 'linear-gradient(135deg, hsla(258,92%,68%,0.08) 0%, hsla(234,28%,8%,1) 50%, hsla(172,85%,48%,0.06) 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

        <div className="relative px-6 py-5 border-b border-primary/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-primary/70 font-semibold uppercase tracking-widest">AI Daily Briefing</p>
            <h3 className="font-heading font-bold text-xl mt-0.5">{today}</h3>
          </div>
          <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center glow-primary shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="relative p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Send, value: summary?.applications_sent || 0, label: 'Sent', color: 'text-violet-500', bg: 'bg-violet-500/10' },
              { icon: MessageSquare, value: summary?.responses_received || 0, label: 'Replies', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { icon: Calendar, value: summary?.interviews_scheduled || 0, label: 'Interviews', color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map((s) => (
              <motion.div
                key={s.label}
                whileHover={{ scale: 1.04 }}
                className={`text-center p-3.5 rounded-2xl ${s.bg} border border-white/40`}
              >
                <s.icon className={`w-4 h-4 mx-auto ${s.color} mb-1.5`} />
                <p className={`text-2xl font-bold font-heading ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {summary?.ai_insights && (
            <div className="p-4 rounded-xl bg-white/5 border border-violet-500/10 backdrop-blur-sm">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{summary.ai_insights}</p>
              </div>
            </div>
          )}

          {summary?.highlights?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Today's Highlights</p>
              <div className="flex flex-wrap gap-2">
                {summary.highlights.map((h, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-white/5 border border-violet-500/15 text-foreground/80">{h}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}