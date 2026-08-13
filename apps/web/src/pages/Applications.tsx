import { useQuery } from "@tanstack/react-query";
import ApplicationsView from "@/components/views/ApplicationsView";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import type { Application } from "@/types/application";

export default function Applications() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      const res = await api<{ success: boolean; data: Application[] }>("/applications");
      return res.data || [];
    },
    enabled: isAuthenticated && !!user?.id,
      staleTime: 60 * 1000,

  });

  return (
    <ApplicationsView
      applications={data}
      isLoading={isLoading || isLoadingAuth}
    />
  );
}
