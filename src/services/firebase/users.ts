import { get, onValue, serverTimestamp, update } from 'firebase/database';

import type { Language } from '@/i18n/languages';
import type { ReminderMinutes } from '@/store/settings';

import { dbRef, paths } from './db';

export type UserRole = 'namazi' | 'intezamia';
export type RoleInMasjid = 'imam' | 'muazzin' | 'committee';

export type UserProfile = {
  role: UserRole;
  name?: string;
  email?: string;
  language?: Language;
  reminderMinutes?: ReminderMinutes;
  defaultRadiusKm?: number;
  changeAlerts?: boolean;
  masjidId?: string;
  roleInMasjid?: RoleInMasjid;
  createdAt?: number;
};

export function subscribeProfile(uid: string, cb: (p: UserProfile | null) => void) {
  return onValue(
    dbRef(paths.user(uid)),
    (snap) => cb(snap.exists() ? (snap.val() as UserProfile) : null),
    () => cb(null),
  );
}

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const snap = await get(dbRef(paths.user(uid)));
  return snap.exists() ? (snap.val() as UserProfile) : null;
}

/** Create / merge the namazi profile after registering or logging in. */
export async function upsertNamaziProfile(
  uid: string,
  data: Pick<
    UserProfile,
    'name' | 'email' | 'language' | 'reminderMinutes' | 'defaultRadiusKm' | 'changeAlerts'
  >,
) {
  const existing = await fetchProfile(uid).catch(() => null);
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) patch[k] = v;
  if (!existing) {
    patch.role = 'namazi';
    patch.createdAt = serverTimestamp();
  }
  await update(dbRef(paths.user(uid)), patch);
}

export async function updateProfileFields(uid: string, patch: Partial<UserProfile>) {
  await update(dbRef(paths.user(uid)), patch);
}
