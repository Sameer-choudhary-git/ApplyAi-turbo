import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AgentStatus({ profile }) {
  const isActive = profile?.isUnstopInternshipEnabled || profile?.isCommudleEventEnabled;
  const platformCount = profile?.preferences?.platforms?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 p-6 bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        
        {/* Header Section */}
        <div className="relative flex items-center gap-4 mb-6">
          {/* Icon - flex-shrink-0 prevents it from squishing */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <motion.div
              animate={isActive ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background ${isActive ? 'bg-emerald-400' : 'bg-muted-foreground'}`}
            />
          </div>
          
          {/* Text & Badge */}
          <div className="flex flex-col gap-1.5 justify-center">
            <h3 className="font-heading font-bold text-base text-foreground leading-none">EngiBuddy Agent</h3>
            <Badge 
              variant="outline" 
              className={`w-fit px-2 py-0.5 text-[10px] font-bold tracking-wider ${isActive 
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
                : 'text-muted-foreground border-border bg-muted/50'
              }`} 
            >
              {isActive ? '● SCANNING' : '○ IDLE'}
            </Badge>
          </div>
        </div>

        {/* Stats List */}
        <div className="relative space-y-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><Zap className="w-4 h-4 text-accent" /></div>
            <span>{profile?.queueCountToday || 0} applications processed</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Shield className="w-4 h-4 text-primary" /></div>
            <span>{platformCount} target platforms configured</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 text-amber-500" /></div>
            <span>Next automation run in ~2 hours</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}