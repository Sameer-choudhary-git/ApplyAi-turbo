/**
 * components/PlatformJobToggles.tsx
 *
 * Fully data-driven from enableJobsConfig.
 *
 * Config shape:
 *   enableJobsConfig = {
 *     unstop: {
 *       name: "unstop",
 *       jobs: {
 *         internship: 'isUnstopInternshipEnabled',
 *         job:        'isUnstopJobEnabled',
 *         events:     'isUnstopEventEnabled',
 *       }
 *     },
 *     commudle: {
 *       name: "commudle",
 *       jobs: { events: 'isCommudleEventEnabled' }
 *     }
 *   }
 *
 * To add a new platform or job: update enableJobsConfig only.
 * Nothing in this file changes.
 *
 * - Platform key  → card heading + accent colour (humanised automatically)
 * - Job key       → human-readable row label   (humanised automatically)
 * - Job value     → flagId used for state + DB PATCH payload
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { enableJobsConfig } from "@applyai/config";
import { Zap } from "lucide-react";

// ─── Accent colours per platform ─────────────────────────────────────────────
// Add an entry when you add a new platform to the config.

type AccentTheme = {
  gradient: string;
  border: string;
  rowBorder: string;
  rowBg: string;
  text: string;
  iconBg: string;
  switchOn: string;
  badgeActive: string;
  badgeInactive: string;
};

const PLATFORM_ACCENT: Record<string, AccentTheme> = {
  unstop: {
    gradient: "bg-gradient-to-br from-blue-500/10 to-indigo-500/5",
    border: "border-blue-500/20",
    rowBorder: "border-blue-500/20",
    rowBg: "bg-blue-500/5",
    text: "text-blue-400",
    iconBg: "bg-blue-500/20",
    switchOn: "data-[state=checked]:bg-blue-500",
    badgeActive: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    badgeInactive: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  },
  commudle: {
    gradient: "bg-gradient-to-br from-violet-500/10 to-purple-500/5",
    border: "border-violet-500/20",
    rowBorder: "border-violet-500/20",
    rowBg: "bg-violet-500/5",
    text: "text-violet-400",
    iconBg: "bg-violet-500/20",
    switchOn: "data-[state=checked]:bg-violet-500",
    badgeActive: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    badgeInactive: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  },
};

const DEFAULT_ACCENT: AccentTheme = {
  gradient: "bg-gradient-to-br from-primary/10 to-primary/5",
  border: "border-primary/20",
  rowBorder: "border-primary/20",
  rowBg: "bg-primary/5",
  text: "text-primary",
  iconBg: "bg-primary/20",
  switchOn: "data-[state=checked]:bg-primary",
  badgeActive: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  badgeInactive: "bg-primary/10 border-primary/20 text-primary",
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** { isUnstopInternshipEnabled: true, isCommudleEventEnabled: false, … } */
export type PlatformFlagState = Record<string, boolean>;

/** { unstop: true, commudle: false } — whether a live session exists */
export type PlatformSessionState = Record<string, boolean>;

interface PlatformJobTogglesProps {
  flagState: PlatformFlagState;
  sessionState: PlatformSessionState;
  /** flagId matches the DB column name, e.g. "isUnstopInternshipEnabled" */
  onFlagToggle: (flagId: string, value: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Turns a camelCase / lowercase key into a readable label.
 * "internship" → "Internship"
 * "myLongJobKey" → "My Long Job Key"
 */
function humanise(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/**
 * Derive the action verb from the job key so the label reads naturally.
 * "events" → "Register"   everything else → "Apply"
 */
function actionVerb(jobKey: string): string {
  return jobKey === "events" ? "Register" : "Apply";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlatformJobToggles({
  flagState,
  sessionState,
  onFlagToggle,
}: PlatformJobTogglesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
          <h3 className="font-heading font-bold text-foreground">
            Automation Jobs
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Enable specific automation tasks per platform. An active session is
            required before turning on any job.
          </p>
        </div>

        <CardContent className="p-6 space-y-6">
          {Object.values(enableJobsConfig).map((platform, platformIdx) => {
            const accent = PLATFORM_ACCENT[platform.name] ?? DEFAULT_ACCENT;
            const sessionActive = sessionState[platform.name] ?? false;

            // platform.jobs is { internship: 'isUnstopInternshipEnabled', ... }
            const jobEntries = Object.entries(platform.jobs) as [string, string][];

            return (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * platformIdx }}
                className={`p-5 rounded-2xl border ${accent.border} ${accent.gradient} space-y-4`}
              >
                {/* Platform header */}
                <div className="flex items-center justify-between">
                  <h4 className={`font-bold text-sm uppercase tracking-wider ${accent.text}`}>
                    {humanise(platform.name)}
                  </h4>
                  <Badge
                    variant="outline"
                    className={`text-xs px-2.5 py-1 ${
                      sessionActive ? accent.badgeActive : accent.badgeInactive
                    }`}
                  >
                    {sessionActive ? "Session active" : "No session"}
                  </Badge>
                </div>

                {/* One toggle row per job entry in config */}
                <div className="space-y-3">
                  {jobEntries.map(([jobKey, flagId]) => {
                    const isEnabled = flagState[flagId] ?? false;

                    return (
                      <div
                        key={flagId}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${accent.rowBorder} ${accent.rowBg}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 w-8 h-8 rounded-lg ${accent.iconBg} flex items-center justify-center flex-shrink-0`}
                          >
                            <Zap className={`w-4 h-4 ${accent.text}`} />
                          </div>
                          <div>
                            <Label className="text-sm font-bold text-foreground">
                              {humanise(jobKey)} Auto-{actionVerb(jobKey)}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Automatically {actionVerb(jobKey).toLowerCase()} for{" "}
                              {humanise(jobKey).toLowerCase()} opportunities on{" "}
                              {humanise(platform.name)} matching your filters.
                              {!sessionActive && (
                                <span className="block mt-1 text-amber-400/80">
                                  ⚠ Requires an active{" "}
                                  {humanise(platform.name)} session.
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          disabled={!sessionActive}
                          onCheckedChange={(v) => onFlagToggle(flagId, v)}
                          className={`${accent.switchOn} flex-shrink-0`}
                        />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}