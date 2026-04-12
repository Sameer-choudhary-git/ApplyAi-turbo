import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { enableJobsConfig } from "@applyai/config";
import {
  SESSION_COMPONENTS,
  EXTRA_COMPONENTS,
} from "@/registry/platformRegistry";

// ─────────────────────────────────────────────────────────────
// Premium Accent Themes (Imported from your toggles component)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function PlatformIntegrationsCard({
  preferredPlatforms,
  onPlatformToggle,
  sessionState,
  onSessionSuccess,
  flagState,
  onFlagToggle,
  platformPrefs,
  onPlatformPrefsChange,
}: any) {
  const platforms = Object.values(enableJobsConfig);
  const activePlatforms = platforms.filter((p) =>
    preferredPlatforms.includes(p.id)
  );

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 bg-muted/10">
        <h3 className="font-heading font-bold text-foreground">
          Platform Integrations
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select and configure the platforms you want to automate.
        </p>
      </div>

      <CardContent className="space-y-8 p-6">
        {/* Platform selection */}
        <div>
          <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 block">
            Enabled Platforms
          </Label>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <Badge
                key={p.id}
                variant="outline"
                className={`cursor-pointer px-4 py-2 transition-all ${
                  preferredPlatforms.includes(p.id)
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-background/50 text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => onPlatformToggle(p.id)}
              >
                {p.displayName}
              </Badge>
            ))}
          </div>
        </div>

        {/* Panels */}
        <AnimatePresence>
          <div className="space-y-6">
            {activePlatforms.map((platform, index) => {
              const accent = PLATFORM_ACCENT[platform.id] ?? DEFAULT_ACCENT;
              const sessionActive = sessionState[platform.id];

              const CookieComp = platform.session?.type
                ? SESSION_COMPONENTS[platform.session.type]
                : null;

              const ExtrasComp = platform.extras?.type
                ? EXTRA_COMPONENTS[platform.extras.type]
                : null;

              return (
                <motion.div
                  key={platform.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <div className={`p-6 rounded-2xl border ${accent.border} ${accent.gradient}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h4 className={`text-lg font-bold tracking-wide ${accent.text}`}>
                        {platform.displayName} Configuration
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-xs px-2.5 py-1 ${
                          sessionActive ? accent.badgeActive : accent.badgeInactive
                        }`}
                      >
                        {sessionActive ? "Session Active" : "No Session"}
                      </Badge>
                    </div>

                    {/* Session Config */}
                    {platform.session && CookieComp && (
                      <div className="mb-6">
                        <CookieComp
                          sessionActive={sessionActive}
                          onSuccess={() => onSessionSuccess(platform.id)}
                        />
                      </div>
                    )}

                    {/* Jobs Toggles */}
                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-2">
                        Automation Tasks
                      </Label>
                      {Object.entries(platform.jobs).map(([_, jobConfig]) => {
                        const enabled = flagState[jobConfig.flag] ?? false;

                        return (
                          <div
                            key={jobConfig.flag}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${accent.rowBorder} ${accent.rowBg}`}
                          >
                            {/* LEFT SIDE */}
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-8 h-8 rounded-lg ${accent.iconBg} flex items-center justify-center flex-shrink-0`}>
                                <Zap className={`w-4 h-4 ${accent.text}`} />
                              </div>
                              <div>
                                <Label className="text-sm font-bold text-foreground">
                                  {jobConfig.label} Auto-{jobConfig.action}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Automatically handle {jobConfig.label.toLowerCase()} tasks on {platform.displayName}.
                                  {!sessionActive && (
                                    <span className="block mt-1 text-amber-400/80">
                                      ⚠ Requires an active session.
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* RIGHT SIDE */}
                            <Switch
                              checked={enabled}
                              disabled={!sessionActive}
                              onCheckedChange={(v) => onFlagToggle(jobConfig.flag, v)}
                              className={`${accent.switchOn} flex-shrink-0`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Extras */}
                    {ExtrasComp && (
                      <div className="mt-6 pt-6 border-t border-border/20">
                        <ExtrasComp
                          accent={accent}
                          platformPrefs={platformPrefs[platform.id] ?? {}}
                          onPlatformPrefsChange={(prefs: any) =>
                            onPlatformPrefsChange(platform.id, prefs)
                          }
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}