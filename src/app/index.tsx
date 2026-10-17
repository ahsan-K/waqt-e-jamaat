import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { useSettings } from '@/store/settings';

/** Route guard (PLAN §7): first launch → welcome; intezamia → dashboard; namazi / guest → map. */
export default function Index() {
  const onboarded = useSettings((s) => s.onboarded);
  const { profile, profileLoaded, isRegistered } = useAuth();
  if (!onboarded) return <Redirect href="/welcome" />;
  if (isRegistered && !profileLoaded) return null;
  if (profile?.role === 'intezamia') return <Redirect href="/dashboard" />;
  return <Redirect href="/map" />;
}
