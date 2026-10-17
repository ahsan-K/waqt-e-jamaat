import { distanceBetween, geohashForLocation, geohashQueryBounds } from 'geofire-common';

import type { GeoEntry, LatLng } from '@/types/masjid';

export const GEOHASH_PRECISION = 10;

export function geohashFor(p: LatLng): string {
  return geohashForLocation([p.lat, p.lng], GEOHASH_PRECISION);
}

/** Great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  return distanceBetween([a.lat, a.lng], [b.lat, b.lng]);
}

/** Geohash [start, end] ranges covering a circle. */
export function radiusBounds(center: LatLng, radiusKm: number): [string, string][] {
  return geohashQueryBounds([center.lat, center.lng], radiusKm * 1000) as [string, string][];
}

export type GeoHit = GeoEntry & { id: string; distanceKm: number };

/** Merge range-query results: dedupe by id, keep only those truly inside, sort by distance. */
export function filterByRadius(
  results: Record<string, GeoEntry>[],
  center: LatLng,
  radiusKm: number,
): GeoHit[] {
  const seen = new Map<string, GeoHit>();
  for (const batch of results) {
    for (const [id, g] of Object.entries(batch)) {
      if (seen.has(id)) continue;
      const d = distanceKm(center, g);
      if (d <= radiusKm) seen.set(id, { ...g, id, distanceKm: d });
    }
  }
  return [...seen.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Round a centre for cache keys (~110 m) so tiny map moves reuse queries. */
export function roundCenter(p: LatLng, decimals = 3): LatLng {
  const f = 10 ** decimals;
  return { lat: Math.round(p.lat * f) / f, lng: Math.round(p.lng * f) / f };
}

/** Walking time at ~5 km/h, rounded up to whole minutes. */
export function walkingMinutes(km: number): number {
  return Math.max(1, Math.ceil((km / 5) * 60));
}

/** Map region (deltas) that fits a circle of radiusKm with some padding. */
export function regionForRadius(center: LatLng, radiusKm: number, padding = 1.25) {
  const latDelta = ((radiusKm * 2 * padding) / 111.32) * 1.0;
  const lngDelta = latDelta / Math.max(0.2, Math.cos((center.lat * Math.PI) / 180));
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/** North / south / east / west points of a circle — fit these to show the whole radius. */
export function circleBounds(center: LatLng, radiusKm: number): LatLng[] {
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  return [
    { lat: center.lat + dLat, lng: center.lng },
    { lat: center.lat - dLat, lng: center.lng },
    { lat: center.lat, lng: center.lng + dLng },
    { lat: center.lat, lng: center.lng - dLng },
  ];
}
