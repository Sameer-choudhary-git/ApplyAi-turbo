import { useLocation } from "react-router-dom";
import { useSentryRouteTracking } from "@/lib/useSentry";

/** Tracks route changes in Sentry without rendering UI. */
export function SentryRouteTracker() {
  const location = useLocation();
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
  return null;
}

export default SentryRouteTracker;
