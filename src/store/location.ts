import { create } from 'zustand';

import type { LatLng } from '@/types/masjid';

/** Last known user location (in memory) so detail screens can show distance/walking time. */
export const useLastLocation = create<{ location: LatLng | null; set: (l: LatLng) => void }>(
  (set) => ({ location: null, set: (location) => set({ location }) }),
);
