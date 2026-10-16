import { PRAYERS, type HHmm, type Masjid, type PrayerKey } from '@/types/masjid';

import { resolveActiveSchedule } from './schedule';

export type TimingChange = {
  /** `${masjidId}:${entryId}:${prayer}` — stored as "seen" once alerted. */
  key: string;
  masjidId: string;
  entryId: string;
  prayer: PrayerKey;
  effectiveFrom: number;
  from: HHmm | null;
  to: HHmm;
};

/**
 * Upcoming jamaat changes in favourite masjids the user hasn't been told about (PLAN §11).
 * Only entries flagged `notify` (the manager chose to alert namazis) count.
 */
export function findUnseenChanges(
  favourites: { id: string; masjid: Pick<Masjid, 'daily'> }[],
  seen: ReadonlySet<string>,
  now: number,
): TimingChange[] {
  const out: TimingChange[] = [];
  for (const { id, masjid } of favourites) {
    const { active, upcoming } = resolveActiveSchedule(masjid, now);
    let prev = active;
    for (const entry of upcoming) {
      if (entry.notify !== false) {
        for (const p of PRAYERS) {
          const before = prev?.times[p]?.jamaat ?? null;
          const after = entry.times[p]?.jamaat;
          if (!after || after === before) continue;
          const key = `${id}:${entry.id}:${p}`;
          if (!seen.has(key)) {
            out.push({
              key,
              masjidId: id,
              entryId: entry.id,
              prayer: p,
              effectiveFrom: entry.effectiveFrom,
              from: before,
              to: after,
            });
          }
        }
      }
      prev = entry;
    }
  }
  return out.sort((a, b) => a.effectiveFrom - b.effectiveFrom);
}
