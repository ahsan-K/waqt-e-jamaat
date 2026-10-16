import { endAt, get, orderByChild, query, startAt } from 'firebase/database';

import { filterByRadius, radiusBounds, type GeoHit } from '@/lib/geo';
import type { GeoEntry, LatLng, Masjid, MasjidStats } from '@/types/masjid';

import { dbRef, paths } from './db';

/** /geo range queries over geohash bounds → hits inside the radius, nearest first. */
export async function queryMasjidsInRadius(center: LatLng, radiusKm: number): Promise<GeoHit[]> {
  const bounds = radiusBounds(center, radiusKm);
  const batches = await Promise.all(
    bounds.map(async ([start, end]) => {
      const snap = await get(
        query(dbRef(paths.geoRoot()), orderByChild('g'), startAt(start), endAt(end)),
      );
      return (snap.val() ?? {}) as Record<string, GeoEntry>;
    }),
  );
  return filterByRadius(batches, center, radiusKm);
}

export async function fetchMasjid(id: string): Promise<Masjid | null> {
  const snap = await get(dbRef(paths.masjid(id)));
  return snap.exists() ? (snap.val() as Masjid) : null;
}

export async function fetchStats(id: string): Promise<MasjidStats> {
  const snap = await get(dbRef(paths.stats(id)));
  return (snap.val() ?? {}) as MasjidStats;
}
