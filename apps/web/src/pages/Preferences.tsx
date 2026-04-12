import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings2, Save } from "lucide-react";
import { toast } from "sonner";

import { apiConfig, enableJobsConfig } from "@applyai/config";

import { AutomationControlCard } from "../components/preferences/AutomationControlCard";
import { RoleSpecificationsCard } from "../components/preferences/RoleSpecificationsCard";
import { KeywordsTargetsCard } from "../components/preferences/KeywordsTargetsCard";
import { PlatformIntegrationsCard } from "../components/preferences/PlatformIntegrationsCard";
import { supabase } from "@/supabaseClient";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type PreferencesState = {
  work_mode: string[];
  opportunity_types: string[];
  min_stipend: number;
  preferred_locations: string[];
  roles_of_interest: string[];
  industries: string[];
  auto_apply: boolean;
  daily_apply_limit: number;
  preferred_platforms: string[]; // now platform IDs (unstop, commudle)
};

type FlagState = Record<string, boolean>;
type SessionState = Record<string, boolean>;
type PlatformPrefs = Record<string, Record<string, unknown>>;

// ─────────────────────────────────────────────────────────────
// Helpers (CONFIG-DRIVEN)
// ─────────────────────────────────────────────────────────────

function buildInitialSessionState(): SessionState {
  return Object.values(enableJobsConfig).reduce((acc, p) => {
    acc[p.id] = false;
    return acc;
  }, {} as SessionState);
}

function buildInitialPlatformPrefs(): PlatformPrefs {
  return Object.values(enableJobsConfig).reduce((acc, p) => {
    acc[p.id] = {};
    return acc;
  }, {} as PlatformPrefs);
}

function extractFlagsFromUser(user: any): FlagState {
  return Object.values(enableJobsConfig).reduce((acc, platform) => {
    Object.values(platform.jobs).forEach((job) => {
      acc[job.flag] = user[job.flag] ?? false;
    });
    return acc;
  }, {} as FlagState);
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function Preferences() {
  const [loading, setLoading] = useState(true);

  const [prefs, setPrefs] = useState<PreferencesState>({
    work_mode: [],
    opportunity_types: [],
    min_stipend: 0,
    preferred_locations: [],
    roles_of_interest: [],
    industries: [],
    auto_apply: false,
    daily_apply_limit: 10,
    preferred_platforms: [],
  });

  const [flagState, setFlagState] = useState<FlagState>({});
  const [sessionState, setSessionState] =
    useState<SessionState>(buildInitialSessionState());

  const [platformPrefs, setPlatformPrefs] =
    useState<PlatformPrefs>(buildInitialPlatformPrefs());

  // ─────────────────────────────────────────────────────────────
  // LOAD USER DATA
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const session = supabase.auth.getSession();
        const token = (await session).data.session?.access_token;
        const res = await fetch(
          `${apiConfig.baseUrl}/api/users/me`,
          { credentials: "include", headers: { "Content-Type": "application/json" , Authorization : `Bearer ${token}` } },
        );

        const data = await res.json();

        if (!data.success) throw new Error("Failed to load user");

        const { user, preferences, sessions } = data;

        // ── Preferences
        setPrefs({
          work_mode: preferences.workModes ?? [],
          opportunity_types: preferences.opportunityTypes ?? [],
          min_stipend: preferences.minStipend ?? 0,
          preferred_locations: preferences.preferredLocations ?? [],
          roles_of_interest: preferences.rolesOfInterest ?? [],
          industries: preferences.industries ?? [],
          auto_apply: preferences.autoApply ?? false,
          daily_apply_limit: preferences.dailyApplyLimit ?? 10,
          preferred_platforms: preferences.platforms ?? [],
        });

        // ── Flags (CONFIG DRIVEN)
setFlagState(data.flags || {});
        // ── Sessions
        setSessionState((prev) => ({
          ...prev,
          ...sessions,
        }));

        // ── Platform Prefs
        setPlatformPrefs((prev) => {
  const updated = { ...prev };

  Object.keys(prev).forEach((platformId) => {
    updated[platformId] =
      preferences[`${platformId}Preferences`] ?? {};
  });

  return updated;
});
       } catch (err) {
         toast.error("Failed to load preferences");
       } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  const toggleArray = (arr: string[], item: string) =>
    arr.includes(item)
      ? arr.filter((x) => x !== item)
      : [...arr, item];

  // ─────────────────────────────────────────────────────────────
  // Save Preferences
  // ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      const res = await fetch(
        `${apiConfig.baseUrl}/api/users/me/preferences`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" , Authorization : `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({
            workModes: prefs.work_mode,
            opportunityTypes: prefs.opportunity_types,
            platforms: prefs.preferred_platforms,
            preferredLocations: prefs.preferred_locations,
            minStipend: prefs.min_stipend,
            industries: prefs.industries,
            rolesOfInterest: prefs.roles_of_interest,
            autoApply: prefs.auto_apply,
            dailyApplyLimit: prefs.daily_apply_limit,

            ...Object.fromEntries(
              Object.entries(platformPrefs).map(([k, v]) => [
                `${k}Preferences`,
                v,
              ])
            ),
          }),
        }
      );

       if (!res.ok) throw new Error();

       toast.success("Preferences updated!");
     } catch {
       toast.error("Failed to save preferences.");
     }
  };

  // ─────────────────────────────────────────────────────────────
  // Flag Toggle
  // ─────────────────────────────────────────────────────────────

  const handleFlagToggle = async (flagId: string, value: boolean) => {
    const owningPlatform = Object.values(enableJobsConfig).find((p) =>
      Object.values(p.jobs).some((j) => j.flag === flagId)
    );

    if (value && !sessionState[owningPlatform?.id ?? ""]) {
      toast.warning("Set up session first.");
      return;
    }

    setFlagState((prev) => ({ ...prev, [flagId]: value }));

    try {
      const res = await fetch(
        `${apiConfig.baseUrl}${apiConfig.endpoints.auth.flags}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" , Authorization : `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({ [flagId]: value }),
        }
      );

      if (!res.ok) throw new Error();

      toast.success(value ? "Enabled" : "Disabled");
    } catch {
      setFlagState((prev) => ({ ...prev, [flagId]: !value }));
      toast.error("Update failed");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Session success
  // ─────────────────────────────────────────────────────────────

  const handleSessionSuccess = (platformId: string) => {
    setSessionState((prev) => ({ ...prev, [platformId]: true }));
  };

  // ─────────────────────────────────────────────────────────────
  // Platform Prefs
  // ─────────────────────────────────────────────────────────────

  const handlePlatformPrefsChange = (
    platformId: string,
    prefs: Record<string, unknown>
  ) => {
    setPlatformPrefs((prev) => ({ ...prev, [platformId]: prefs }));
  };

  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Preferences</h1>
            <p className="text-sm text-muted-foreground">
              Configure automation & targeting
            </p>
          </div>
        </div>

        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Automation */}
      <AutomationControlCard
        autoApply={prefs.auto_apply}
        dailyApplyLimit={prefs.daily_apply_limit}
        onAutoApplyChange={(v) =>
          setPrefs((p) => ({ ...p, auto_apply: v }))
        }
        onDailyLimitChange={(v) =>
          setPrefs((p) => ({ ...p, daily_apply_limit: v }))
        }
      />

      {/* Role + Keywords */}
      <div className="grid md:grid-cols-2 gap-6">
        <RoleSpecificationsCard
          workMode={prefs.work_mode}
          opportunityTypes={prefs.opportunity_types}
          minStipend={prefs.min_stipend}
          preferredLocations={prefs.preferred_locations}
          onWorkModeToggle={(mode) =>
            setPrefs((p) => ({
              ...p,
              work_mode: toggleArray(p.work_mode, mode),
            }))
          }
          onOpportunityTypeToggle={(type) =>
            setPrefs((p) => ({
              ...p,
              opportunity_types: toggleArray(p.opportunity_types, type),
            }))
          }
          onMinStipendChange={(v) =>
            setPrefs((p) => ({ ...p, min_stipend: v }))
          }
          onAddLocation={(loc) =>
            setPrefs((p) => ({
              ...p,
              preferred_locations: [...p.preferred_locations, loc],
            }))
          }
          onRemoveLocation={(loc) =>
            setPrefs((p) => ({
              ...p,
              preferred_locations: p.preferred_locations.filter(
                (l) => l !== loc
              ),
            }))
          }
        />

        <KeywordsTargetsCard
          rolesOfInterest={prefs.roles_of_interest}
          industries={prefs.industries}
          onAddRole={(role) =>
            setPrefs((p) => ({
              ...p,
              roles_of_interest: [...p.roles_of_interest, role],
            }))
          }
          onRemoveRole={(role) =>
            setPrefs((p) => ({
              ...p,
              roles_of_interest: p.roles_of_interest.filter(
                (r) => r !== role
              ),
            }))
          }
          onAddIndustry={(ind) =>
            setPrefs((p) => ({
              ...p,
              industries: [...p.industries, ind],
            }))
          }
          onRemoveIndustry={(ind) =>
            setPrefs((p) => ({
              ...p,
              industries: p.industries.filter((i) => i !== ind),
            }))
          }
        />
      </div>

      {/* Platforms */}
      <PlatformIntegrationsCard
        preferredPlatforms={prefs.preferred_platforms}
        onPlatformToggle={(platformId) =>
          setPrefs((p) => ({
            ...p,
            preferred_platforms: toggleArray(p.preferred_platforms, platformId),
          }))
        }
        sessionState={sessionState}
        onSessionSuccess={handleSessionSuccess}
        flagState={flagState}
        onFlagToggle={handleFlagToggle}
        platformPrefs={platformPrefs}
        onPlatformPrefsChange={handlePlatformPrefsChange}
      />
    </div>
  );
}