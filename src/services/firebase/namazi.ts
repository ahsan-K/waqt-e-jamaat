import { increment, onValue, push, serverTimestamp, update } from 'firebase/database';

import { dbRef, paths } from './db';

export type FavouriteEntry = { reminderOn: boolean; createdAt: number };

export function subscribeFavourites(uid: string, cb: (f: Record<string, FavouriteEntry>) => void) {
  return onValue(
    dbRef(paths.favorites(uid)),
    (snap) => cb((snap.val() ?? {}) as Record<string, FavouriteEntry>),
    () => cb({}),
  );
}

/** Favourite on/off + counter in one multi-path update (PLAN §5). */
export async function setFavourite(uid: string, masjidId: string, on: boolean) {
  await update(dbRef(''), {
    [paths.favorite(uid, masjidId)]: on ? { reminderOn: true, createdAt: serverTimestamp() } : null,
    [`${paths.stats(masjidId)}/favourites`]: increment(on ? 1 : -1),
  });
}

export async function setReminder(uid: string, masjidId: string, on: boolean) {
  await update(dbRef(paths.favorite(uid, masjidId)), { reminderOn: on });
}

/** One confirmation per user + counter, atomically. */
export async function confirmTimings(uid: string, masjidId: string, timingsVersion: number) {
  await update(dbRef(''), {
    [paths.confirmation(masjidId, uid)]: { at: serverTimestamp(), timingsVersion },
    [`${paths.stats(masjidId)}/confirmations`]: increment(1),
  });
}

export function subscribeConfirmation(
  uid: string,
  masjidId: string,
  cb: (confirmed: boolean) => void,
) {
  return onValue(
    dbRef(paths.confirmation(masjidId, uid)),
    (s) => cb(s.exists()),
    () => cb(false),
  );
}

/** Namazi asks the masjid to add timings (guests allowed). */
export async function requestTimings(uid: string, masjidId: string, notifyWhenAdded: boolean) {
  await update(dbRef(''), {
    [paths.timingRequest(masjidId, uid)]: { at: serverTimestamp(), notifyWhenAdded },
    [`${paths.stats(masjidId)}/requests`]: increment(1),
  });
}

export async function reportTiming(
  uid: string,
  masjidId: string,
  data: { prayer?: string; note?: string },
) {
  const clean: Record<string, unknown> = { uid, at: serverTimestamp() };
  if (data.prayer) clean.prayer = data.prayer;
  if (data.note?.trim()) clean.note = data.note.trim().slice(0, 500);
  await push(dbRef(paths.reports(masjidId)), clean);
}
