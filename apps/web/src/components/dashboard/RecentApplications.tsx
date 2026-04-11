import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function RecentApplications({ applications }) {
  const recent = applications?.slice(0, 5) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden h-full">
        <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Pipeline</p>
            <h3 className="font-heading font-bold text-lg mt-0.5 text-foreground">Recent Applications</h3>
          </div>
          <Link to="/applications" className="text-xs text-primary font-bold tracking-wide hover:text-primary/80 transition-colors">VIEW ALL</Link>
        </div>
        
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50">
                <Search className="w-6 h-6 text-muted-foreground/70" />
              </div>
              <p className="text-foreground font-semibold text-base">No applications yet</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-[280px] leading-relaxed">
                EngiBuddy is scanning platforms for roles that match your profile. Activity will appear here soon.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {/* List maps here */}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}