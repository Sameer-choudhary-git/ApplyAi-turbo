import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSentryRouteTracking } from "@/lib/useSentry";

/**
 * Component that tracks all route changes in Sentry
 * Should be placed at the top level of your Router
 */
export function SentryRouteTracker() {
  const location = useLocation();

  // Get a friendly name for the current page
  const getPageName = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return "Dashboard";
    
    const names: Record<string, string> = {
      applications: "Applications",
      schedule: "Schedule",
      tasks: "Tasks",
      analytics: "Analytics",
      preferences: "Preferences",
      networking: "Networking",
      "saved-jobs": "Saved Jobs",
      admin: "Admin",
      login: "Login",
    };

    return names[segments[0]] || segments[0];
  };

  useSentryRouteTracking(location.pathname, getPageName(location.pathname));

  return null; // This is a tracking component, no UI
}

export default SentryRouteTracker;
