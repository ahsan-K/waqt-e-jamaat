import { ref, type DatabaseReference } from 'firebase/database';

import { db } from './app';

/** Typed RTDB paths (PLAN §5). */
export const paths = {
  user: (uid: string) => `users/${uid}`,
  favorites: (uid: string) => `favorites/${uid}`,
  favorite: (uid: string, masjidId: string) => `favorites/${uid}/${masjidId}`,
  masjid: (id: string) => `masjids/${id}`,
  geoRoot: () => 'geo',
  geo: (id: string) => `geo/${id}`,
  stats: (id: string) => `masjidStats/${id}`,
  confirmation: (masjidId: string, uid: string) => `confirmations/${masjidId}/${uid}`,
  timingRequests: (masjidId: string) => `timingRequests/${masjidId}`,
  timingRequest: (masjidId: string, uid: string) => `timingRequests/${masjidId}/${uid}`,
  reports: (masjidId: string) => `reports/${masjidId}`,
} as const;

/** Ref for a path; empty path = database root (used for multi-path updates). */
export function dbRef(path: string): DatabaseReference {
  return path ? ref(db, path) : ref(db);
}
