import { useQuery } from "@tanstack/react-query";
import ApplicationsView from "@/components/views/ApplicationsView";
import { supabase } from "@/supabaseClient";
import { useEffect, useState } from "react";

export default function Applications() {
  const [user, setUser] = useState<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const session = await supabase.auth.getSession();
      // console.log("Session data:", session);
      setToken(session.data.session?.access_token || null);
      setUser(session.data.session?.user);
      setIsSessionLoading(false);
    };
    getSession();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: () =>
      fetch('http://localhost:3000/api/applications', { credentials: 'include', headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(res => res.data),
    enabled: !!user?.id && !isSessionLoading,
  });

  return <ApplicationsView applications={data ?? []} isLoading={isLoading || isSessionLoading} />;
}
