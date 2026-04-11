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
      className="h-full"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col">
        {/* Decorative blobs */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

        {/* Header - Aligned with other cards */}
        <div className="relative px-6 py-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">AI Daily Briefing</p>
            <h3 className="font-heading font-bold text-lg mt-0.5 text-foreground">{today}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6 flex-1 flex flex-col gap-6 justify-between">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { icon: Send, value: summary?.applications_sent || 0, label: 'Sent', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
              { icon: MessageSquare, value: summary?.responses_received || 0, label: 'Replies', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { icon: Calendar, value: summary?.interviews_scheduled || 0, label: 'Interviews', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            ].map((s) => (
              <motion.div
                key={s.label}
                whileHover={{ scale: 1.02 }}
                className={`text-center p-4 rounded-xl border ${s.bg} transition-all`}
              >
                <s.icon className={`w-4 h-4 mx-auto ${s.color} mb-2`} />
                <p className={`text-2xl font-bold font-heading ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="space-y-4">
            {/* AI Insights */}
            {summary?.ai_insights && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed font-medium">{summary.ai_insights}</p>
                </div>
              </div>
            )}

            {/* Highlights */}
            {summary?.highlights?.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Today's Highlights</p>
                <div className="flex flex-wrap gap-2">
                  {summary.highlights.map((h, i) => (
                    <Badge key={i} variant="secondary" className="px-2.5 py-1 text-xs bg-background/50 border-border/50 font-medium">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}