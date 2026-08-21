import { useQuery } from "@tanstack/react-query";
import AnalyticsView from "@/components/views/AnalyticsView";
import { supabase } from "@/supabaseClient";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Analytics() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const session = await supabase.auth.getSession();
      const sessionUser = session.data.session?.user;
      setUser(sessionUser ? { id: sessionUser.id } : null);
      setIsSessionLoading(false);
    };

    getSession();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      const response = await api<{ success: boolean; data: unknown[] }>(
        "/applications",
      );
      return response.data;
    },
    enabled: !!user?.id && !isSessionLoading,
  });

  return (
    <AnalyticsView
      applications={data ?? []}
      isLoading={isLoading || isSessionLoading}
    />
  );
}
