import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import Onboarding from "../pages/Onboarding";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { AppLoadingSkeleton } from "@/components/ui/loading-skeletons";

export default function AppShell() {
  const { user, isLoadingAuth } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const data = await api<{ user: { isOnboarded?: boolean } }>("/users/me");
      return data.user;
    },
    enabled: !!user?.id,
  });

  if (!isLoadingAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  const needsOnboarding = !isLoading && (!profile || !profile.isOnboarded);

  if (isLoading || isLoadingAuth) {
    return <AppLoadingSkeleton label="Preparing your Apply AI workspace" />;
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return <AppLayout />;
}
