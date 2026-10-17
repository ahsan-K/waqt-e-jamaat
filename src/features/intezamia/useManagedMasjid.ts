import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { subscribeMasjid, subscribeStats } from '@/services/firebase/intezamia';
import type { Masjid, MasjidStats } from '@/types/masjid';

/** Live masjid + stats for the signed-in intezamia (one masjid per account in MVP). */
export function useManagedMasjid() {
  const { profile, profileLoaded } = useAuth();
  const id = profile?.role === 'intezamia' ? profile.masjidId : undefined;
  const [state, setState] = useState<{ id?: string; masjid: Masjid | null; loaded: boolean }>({
    masjid: null,
    loaded: false,
  });
  const [stats, setStats] = useState<MasjidStats>({});

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeMasjid(id, (masjid) => setState({ id, masjid, loaded: true }));
    const unsubStats = subscribeStats(id, setStats);
    return () => {
      unsub();
      unsubStats();
    };
  }, [id]);

  const current = state.id === id ? state : { masjid: null, loaded: false };
  return {
    id,
    masjid: current.masjid,
    stats,
    loading: !profileLoaded || (!!id && !current.loaded),
  };
}
