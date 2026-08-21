import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import Onboarding from "../pages/Onboarding";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

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
    return (
      <div className="auth-shell fixed inset-0 flex items-center justify-center bg-background">
        <div className="page-enter text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return <AppLayout />;
}
