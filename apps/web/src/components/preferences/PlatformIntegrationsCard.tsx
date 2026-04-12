import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { enableJobsConfig } from "@applyai/config";
import {
  SESSION_COMPONENTS,
  EXTRA_COMPONENTS,
} from "@/registry/platformRegistry";

// ─────────────────────────────────────────────────────────────
// Accent Themes
// ─────────────────────────────────────────────────────────────

const PLATFORM_ACCENT: Record<string, any> = {
  unstop: {
    border: "border-blue-500/20",
    text: "text-blue-400",
  },
  commudle: {
    border: "border-violet-500/20",
    text: "text-violet-400",
  },
};

const DEFAULT_ACCENT = PLATFORM_ACCENT.unstop;

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
}) {
  const platforms = Object.values(enableJobsConfig);

  const activePlatforms = platforms.filter((p) =>
    preferredPlatforms.includes(p.id)
  );

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        {/* Platform selection */}
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <Badge
              key={p.id}
              className={`cursor-pointer ${
                preferredPlatforms.includes(p.id)
                  ? "bg-primary text-white"
                  : ""
              }`}
              onClick={() => onPlatformToggle(p.id)}
            >
              {p.displayName}
            </Badge>
          ))}
        </div>

        {/* Panels */}
        <AnimatePresence>
          {activePlatforms.map((platform) => {
            const accent = PLATFORM_ACCENT[platform.id] ?? DEFAULT_ACCENT;
            const sessionActive = sessionState[platform.id];

            const CookieComp = platform.session?.type
              ? SESSION_COMPONENTS[platform.session.type]
              : null;

            const ExtrasComp = platform.extras?.type
              ? EXTRA_COMPONENTS[platform.extras.type]
              : null;

            return (
              <motion.div key={platform.id}>
                <div className={`p-5 rounded-xl border ${accent.border}`}>
                  {/* Header */}
                  <h4 className={accent.text}>
                    {platform.displayName} Configuration
                  </h4>

                  {/* Session */}
                  {platform.session && CookieComp && (
                    <CookieComp
                      sessionActive={sessionActive}
                      onSuccess={() => onSessionSuccess(platform.id)}
                    />
                  )}

                  {/* Jobs */}
                  <div className="space-y-3 mt-4">
                    {Object.entries(platform.jobs).map(([_, jobConfig]) => {
                      const enabled = flagState[jobConfig.flag] ?? false;

                      return (
                        <div
                          key={jobConfig.flag}
                          className="flex items-center justify-between"
                        >
                          {/* LEFT SIDE */}
                          <div className="flex items-center h-6">
                            <span className="text-sm font-medium">
                              {jobConfig.label} Auto-{jobConfig.action}
                            </span>

                            {!sessionActive && (
                              <span className="text-xs text-amber-400 ml-2">
                                (requires session)
                              </span>
                            )}
                          </div>

                          {/* RIGHT SIDE */}
                          <Switch
                            checked={enabled}
                            disabled={!sessionActive}
                            onCheckedChange={(v) =>
                              onFlagToggle(jobConfig.flag, v)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Extras */}
                  {ExtrasComp && (
                    <div className="mt-4">
                      <ExtrasComp
                        accent={accent}
                        platformPrefs={platformPrefs[platform.id] ?? {}}
                        onPlatformPrefsChange={(prefs) =>
                          onPlatformPrefsChange(platform.id, prefs)
                        }
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}