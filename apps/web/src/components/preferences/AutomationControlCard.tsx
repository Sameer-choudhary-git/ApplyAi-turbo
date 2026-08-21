import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

interface AutomationControlCardProps {
  autoApply: boolean;
  dailyApplyLimit: number;
  platformLimits: Record<string, number>;
  onAutoApplyChange: (value: boolean) => void;
  onDailyLimitChange: (value: number) => void;
  onPlatformLimitChange: (platform: string, value: number) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  unstop: "Unstop",
  commudle: "Commudle",
  linkedin: "LinkedIn",
};

export function AutomationControlCard({
  autoApply,
  dailyApplyLimit,
  platformLimits,
  onAutoApplyChange,
  onDailyLimitChange,
  onPlatformLimitChange,
}: AutomationControlCardProps) {
  const configuredPlatforms = Object.keys(platformLimits).length
    ? Object.keys(platformLimits)
    : ["greenhouse", "unstop", "commudle", "linkedin"];
  const platformTotal = configuredPlatforms.reduce(
    (total, platform) =>
      total + Math.min(12, Math.max(0, platformLimits[platform] ?? 0)),
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="border-b border-border/50 bg-muted/10 px-6 py-4">
          <h3 className="font-heading font-bold text-foreground">
            Automation limits
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The platform limits must add up to no more than the overall daily
            limit. Every platform is capped at 12.
          </p>
        </div>
        <CardContent className="space-y-8 p-6">
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center">
            <div>
              <Label className="text-base font-bold text-foreground">
                Auto-apply engine
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                For now, Greenhouse applications always stop for manual
                confirmation.
              </p>
            </div>
            <Switch
              checked={autoApply}
              onCheckedChange={onAutoApplyChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className={!autoApply ? "pointer-events-none opacity-50" : ""}>
            <div className="mb-4 flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Overall daily limit
              </Label>
              <span className="font-heading text-xl font-bold text-primary">
                {dailyApplyLimit}
              </span>
            </div>
            <Slider
              value={[dailyApplyLimit]}
              onValueChange={([value]) => onDailyLimitChange(value)}
              min={1}
              max={50}
              step={1}
              className="py-2"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              This is the maximum across all platforms combined.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {configuredPlatforms.map((platform) => {
                const value = Math.min(
                  12,
                  Math.max(0, platformLimits[platform] ?? 0),
                );
                const otherTotal = platformTotal - value;
                const maxAllowed = Math.min(
                  12,
                  Math.max(0, dailyApplyLimit - otherTotal),
                );
                return (
                  <div
                    key={platform}
                    className="rounded-xl border border-border/60 bg-background/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs font-semibold text-foreground">
                        {PLATFORM_LABELS[platform] ?? platform}
                      </Label>
                      <input
                        type="number"
                        min={0}
                        max={maxAllowed}
                        value={value}
                        onChange={(event) =>
                          onPlatformLimitChange(
                            platform,
                            Math.min(
                              maxAllowed,
                              Math.max(0, Number(event.target.value) || 0),
                            ),
                          )
                        }
                        className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Maximum 12 per day
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Configured platform total: {platformTotal} / {dailyApplyLimit}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
