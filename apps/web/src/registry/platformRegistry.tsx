import { UnstopCookieSetup } from "@/components/preferences/PlatformSpecificationsCard/UnstopCookieSetup";

export const SESSION_COMPONENTS = {
  cookie: UnstopCookieSetup,
};

export const EXTRA_COMPONENTS = {
  competitionFilters: (_props: { accent: Record<string, string> }) => {
    return <div className="text-sm text-muted-foreground">Extras UI</div>;
  },
};
