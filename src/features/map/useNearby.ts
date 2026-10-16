import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCalculatedMany } from '@/features/masjid/calculated';
import { useMasjids } from '@/features/masjid/queries';
import type { NextCalculated } from '@/lib/calculated';
import { roundCenter, type GeoHit } from '@/lib/geo';
import { getNextJamaat, type NextJamaat } from '@/lib/schedule';
import { queryMasjidsInRadius } from '@/services/firebase/masjids';
import { queryKeys } from '@/services/queryClient';
import type { LatLng, Masjid } from '@/types/masjid';

export type NearbyItem = GeoHit & {
  masjid: Masjid | null | undefined;
  next: NextJamaat | NextCalculated | null;
  estimated: boolean;
};

/** Max masjid detail reads per query (only what's on screen / in the list). */
const DETAIL_LIMIT = 30;

export function useNearby(origin: LatLng | null, radiusKm: number, now: number) {
  const c = origin ? roundCenter(origin) : null;
  const hitsQuery = useQuery({
    queryKey: queryKeys.nearby(c?.lat ?? 0, c?.lng ?? 0, radiusKm),
    queryFn: () => queryMasjidsInRadius(c!, radiusKm),
    enabled: !!c,
    placeholderData: keepPreviousData,
  });
  // Previous radius' hits may include masjids now outside: filter again.
  const hits = useMemo(
    () => (hitsQuery.data ?? []).filter((h) => h.distanceKm <= radiusKm),
    [hitsQuery.data, radiusKm],
  );
  const ids = useMemo(() => hits.slice(0, DETAIL_LIMIT).map((h) => h.id), [hits]);
  const masjids = useMasjids(ids);
  const estimateLocs = useMemo(
    () =>
      hits.filter((h) => !h.hasTimings).map((h) => ({ id: h.id, loc: { lat: h.lat, lng: h.lng } })),
    [hits],
  );
  const calculated = useCalculatedMany(estimateLocs, now);

  const items: NearbyItem[] = useMemo(() => {
    const list = hits.map((h) => {
      const masjid = masjids[h.id];
      const real = h.hasTimings && masjid ? getNextJamaat(masjid, now) : null;
      return {
        ...h,
        masjid,
        next: real ?? (h.hasTimings ? null : (calculated[h.id] ?? null)),
        estimated: !h.hasTimings,
      };
    });
    // Masjids with real timings first, then estimates; each by distance (PLAN §4).
    return list.sort(
      (a, b) => Number(a.estimated) - Number(b.estimated) || a.distanceKm - b.distanceKm,
    );
  }, [hits, masjids, calculated, now]);

  return {
    items,
    nearestId: hits[0]?.id ?? null,
    isLoading: hitsQuery.isLoading,
    isError: hitsQuery.isError,
    refetch: hitsQuery.refetch,
  };
}
