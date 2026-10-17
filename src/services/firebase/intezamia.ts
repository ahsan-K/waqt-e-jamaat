import { onValue, push, serverTimestamp, update } from 'firebase/database';

import type { Language } from '@/i18n/languages';
import { geohashFor } from '@/lib/geo';
import {
  DEFAULT_TIMEZONE,
  type DailyEntry,
  type DailyTimes,
  type LatLng,
  type Masjid,
  type SpecialPrayer,
} from '@/types/masjid';

import { createManagerAccount } from './auth';
import { dbRef, paths } from './db';
import { queryMasjidsInRadius } from './masjids';
import type { RoleInMasjid } from './users';

export type RegistrationInput = {
  account: {
    name: string;
    email: string;
    password: string;
    roleInMasjid: RoleInMasjid;
    language: Language;
  };
  masjid: { nameEn: string; nameUr: string; address: string; location: LatLng };
  /** Omitted when the manager chose "Baad mein add karein". */
  timings?: { daily: DailyTimes; jumma?: { khutba: string; jamaat: string } };
  today: string;
};

/**
 * Intezamia registration (PLAN §7): create the email account, then in ONE multi-path update
 * write /users/{uid} (role intezamia + masjidId) and /masjids/{id} with status 'pending'.
 */
export async function registerMasjid(
  input: RegistrationInput,
): Promise<{ uid: string; masjidId: string }> {
  const { account, masjid, timings, today } = input;
  const user = await createManagerAccount(account.name, account.email, account.password);
  const masjidId = push(dbRef('masjids')).key!;
  const now = Date.now();
  const record: Record<string, unknown> = {
    name: { en: masjid.nameEn.trim(), ur: masjid.nameUr.trim() || masjid.nameEn.trim() },
    address: masjid.address.trim(),
    lat: masjid.location.lat,
    lng: masjid.location.lng,
    geohash: geohashFor(masjid.location),
    timezone: DEFAULT_TIMEZONE,
    status: 'pending',
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
  };
  if (timings) {
    record.daily = {
      d1: { effectiveFrom: now, times: timings.daily, createdBy: user.uid } satisfies DailyEntry,
    };
    record.timingsUpdatedAt = now;
    if (timings.jumma) {
      record.specials = {
        jumma: {
          type: 'jumma',
          times: { khutba: timings.jumma.khutba, jamaat: timings.jumma.jamaat },
          repeat: { kind: 'weekly', weekday: 5, from: today },
          dateConfirmed: true,
          remindManagement: false,
          replacesPrayer: 'zuhr',
          updatedAt: now,
        } satisfies SpecialPrayer,
      };
    }
  }
  await update(dbRef(''), {
    [paths.user(user.uid)]: {
      role: 'intezamia',
      name: account.name.trim(),
      email: account.email.trim(),
      language: account.language,
      roleInMasjid: account.roleInMasjid,
      masjidId,
      createdAt: serverTimestamp(),
    },
    [paths.masjid(masjidId)]: record,
  });
  return { uid: user.uid, masjidId };
}

/** Warn during registration if an approved masjid is within ~50 m (pending ones aren't visible). */
export async function findNearbyDuplicates(location: LatLng) {
  return queryMasjidsInRadius(location, 0.05);
}

export function subscribeMasjid(id: string, cb: (m: Masjid | null) => void) {
  return onValue(
    dbRef(paths.masjid(id)),
    (s) => cb(s.exists() ? (s.val() as Masjid) : null),
    () => cb(null),
  );
}

export function subscribeStats(
  id: string,
  cb: (s: { confirmations?: number; requests?: number; favourites?: number }) => void,
) {
  return onValue(
    dbRef(paths.stats(id)),
    (s) => cb(s.val() ?? {}),
    () => cb({}),
  );
}

/**
 * Save the whole daily map (already pruned) + timingsUpdatedAt. When the masjid is approved,
 * also flip /geo/{id}/hasTimings (owner may write only that child).
 */
export async function saveDaily(id: string, masjid: Masjid, daily: Record<string, DailyEntry>) {
  const updates: Record<string, unknown> = {
    [`${paths.masjid(id)}/daily`]: daily,
    [`${paths.masjid(id)}/timingsUpdatedAt`]: Date.now(),
  };
  if (masjid.status === 'approved')
    updates[`${paths.geo(id)}/hasTimings`] = Object.keys(daily).length > 0;
  await update(dbRef(''), updates);
}

export async function saveSpecial(id: string, specialId: string | null, special: SpecialPrayer) {
  const sid = specialId ?? push(dbRef(`${paths.masjid(id)}/specials`)).key!;
  await update(dbRef(''), {
    [`${paths.masjid(id)}/specials/${sid}`]: clean({ ...special, updatedAt: Date.now() }),
    [`${paths.masjid(id)}/timingsUpdatedAt`]: Date.now(),
  });
  return sid;
}

export async function deleteSpecials(id: string, specialIds: string[]) {
  if (!specialIds.length) return;
  await update(
    dbRef(''),
    Object.fromEntries(specialIds.map((sid) => [`${paths.masjid(id)}/specials/${sid}`, null])),
  );
}

/** "Haan, sahi hain" on the Dashboard "Kal" card. */
export async function confirmSpecialFor(id: string, specialId: string, date: string) {
  await update(dbRef(`${paths.masjid(id)}/specials/${specialId}`), { lastConfirmedFor: date });
}

export type ReportRow = {
  id: string;
  uid: string;
  prayer?: string;
  note?: string;
  photoUrl?: string;
  at: number;
};

export function subscribeReports(id: string, cb: (rows: ReportRow[]) => void) {
  return onValue(
    dbRef(paths.reports(id)),
    (s) =>
      cb(
        Object.entries((s.val() ?? {}) as Record<string, Omit<ReportRow, 'id'>>).map(
          ([rid, r]) => ({ ...r, id: rid }),
        ),
      ),
    () => cb([]),
  );
}

export function subscribeRequests(id: string, cb: (rows: { uid: string; at: number }[]) => void) {
  return onValue(
    dbRef(paths.timingRequests(id)),
    (s) =>
      cb(
        Object.entries((s.val() ?? {}) as Record<string, { at: number }>).map(([uid, r]) => ({
          uid,
          at: r.at,
        })),
      ),
    () => cb([]),
  );
}

/** RTDB rejects undefined values. */
function clean<T extends object>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
