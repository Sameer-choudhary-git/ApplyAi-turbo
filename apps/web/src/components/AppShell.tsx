import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Onboarding from '../pages/Onboarding';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/supabaseClient';

export default function AppShell() {
  const { user, isLoadingAuth } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; 
      return data;
    },
    enabled: !!user?.id,
  });

  if (!isLoadingAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  const needsOnboarding = !isLoading && (!profile || !profile.isOnboarded);

  if (isLoading || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return <AppLayout />;
}