import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './layout/AppLayout';
import Onboarding from '../pages/Onboarding';
// ✅ replaced: db.entities.UserProfile — now using localStorage
import { localStore } from '@/utils/localStorage';

export default function AppShell() {
  const queryClient = useQueryClient();

  // ✅ replaced: db.entities.UserProfile.list('-created_date', 1)
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => Promise.resolve(localStore.getProfile()),
    // no network call — resolves instantly, but we still get the
    // loading / success / error states that the rest of the component expects
  });

  const needsOnboarding = !isLoading && !profile?.onboarding_completed;

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <Onboarding
        onComplete={() => queryClient.invalidateQueries({ queryKey: ['userProfile'] })}
      />
    );
  }

  return <AppLayout />;
}