/**
 * components/AutomationControlCard.tsx
 *
 * Controls global auto-apply toggle and daily application limit.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

interface AutomationControlCardProps {
  autoApply: boolean;
  dailyApplyLimit: number;
  onAutoApplyChange: (value: boolean) => void;
  onDailyLimitChange: (value: number) => void;
}

export function AutomationControlCard({
  autoApply,
  dailyApplyLimit,
  onAutoApplyChange,
  onDailyLimitChange,
}: AutomationControlCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
          <h3 className="font-heading font-bold text-foreground">
            Automation Control
          </h3>
        </div>
        <CardContent className="p-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <div>
              <Label className="text-base font-bold text-foreground">
                Auto-Apply Engine
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Allow EngiBuddy to automatically submit applications on your
                behalf.
              </p>
            </div>
            <Switch
              checked={autoApply}
              onCheckedChange={onAutoApplyChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className={!autoApply ? "opacity-50 pointer-events-none" : ""}>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-semibold text-foreground">
                Daily Application Limit
              </Label>
              <span className="text-xl font-heading font-bold text-primary">
                {dailyApplyLimit}
              </span>
            </div>
            <Slider
              value={[dailyApplyLimit]}
              onValueChange={([v]) => onDailyLimitChange(v)}
              min={1}
              max={50}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground mt-3">
              To avoid platform rate-limits, we recommend keeping this under
              25/day.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
