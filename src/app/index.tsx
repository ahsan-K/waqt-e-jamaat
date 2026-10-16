import { Redirect } from 'expo-router';

import { useSettings } from '@/store/settings';

/** Route guard: first launch → welcome; afterwards → map. Role routing is added with auth. */
export default function Index() {
  const onboarded = useSettings((s) => s.onboarded);
  return <Redirect href={onboarded ? '/map' : '/welcome'} />;
}
