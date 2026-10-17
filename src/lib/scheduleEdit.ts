import {
  DEFAULT_TIMEZONE,
  PRAYERS,
  type DailyEntry,
  type DailyTimes,
  type Masjid,
  type PrayerKey,
  type PrayerTime,
  type SpecialPrayer,
  type SpecialType,
} from '@/types/masjid';

import { dailyEntryAt } from './schedule';
import { addDays, dateKey, startOfDay, weekdayOf } from './time';

/** Typical Karachi times used to pre-fill an empty schedule (Schedule mockup DEFAULT_DAILY). */
export const DEFAULT_DAILY_TIMES: DailyTimes = {
  fajr: { azaan: '05:12', jamaat: '05:40' },
  zuhr: { azaan: '12:24', jamaat: '13:15' },
  asr: { azaan: '16:20', jamaat: '16:45' },
  maghrib: { azaan: '17:58', jamaat: '18:03' },
  isha: { azaan: '19:15', jamaat: '20:00' },
};

export type ApplyWhen = { kind: 'now' } | { kind: 'tomorrow' } | { kind: 'date'; date: string };

/**
 * Change one prayer (PLAN §4 Schedule editor):
 * - now  → update the active entry (and future entries that still carried the old value);
 * - tomorrow / date → add (or update) an entry effective from that day's start,
 *   copying the times in force then with this prayer changed.
 * Entries older than the active one are pruned. Returns the new `daily` map.
 */
export function applyDailyChange(
  masjid: Pick<Masjid, 'daily' | 'timezone'>,
  prayer: PrayerKey,
  value: PrayerTime,
  when: ApplyWhen,
  opts: { now: number; uid: string; notify: boolean; newId: () => string },
): Record<string, DailyEntry> {
  const tz = masjid.timezone || DEFAULT_TIMEZONE;
  const daily: Record<string, DailyEntry> = structuredCloneSafe(masjid.daily ?? {});
  const { now, uid, notify, newId } = opts;

  if (when.kind === 'now') {
    const active = dailyEntryAt({ daily }, now);
    if (!active) {
      daily[newId()] = {
        effectiveFrom: now,
        times: { ...DEFAULT_DAILY_TIMES, [prayer]: value },
        createdBy: uid,
      };
    } else {
      const old = active.times[prayer];
      daily[active.id] = { ...daily[active.id]!, times: { ...active.times, [prayer]: value } };
      for (const [id, e] of Object.entries(daily)) {
        if (e.effectiveFrom > now && old && sameTime(e.times[prayer], old)) {
          daily[id] = { ...e, times: { ...e.times, [prayer]: value } };
        }
      }
    }
  } else {
    const date = when.kind === 'tomorrow' ? addDays(dateKey(now, tz), 1) : when.date;
    const from = startOfDay(date, tz);
    const existing = Object.entries(daily).find(([, e]) => e.effectiveFrom === from);
    if (existing) {
      const [id, e] = existing;
      daily[id] = { ...e, times: { ...e.times, [prayer]: value }, notify: notify || e.notify };
    } else {
      const base = dailyEntryAt({ daily }, from)?.times ?? DEFAULT_DAILY_TIMES;
      daily[newId()] = {
        effectiveFrom: from,
        times: { ...base, [prayer]: value },
        createdBy: uid,
        notify,
      };
    }
  }
  return pruneDaily(daily, now);
}

/** Keep the active entry and everything after it (PLAN §5 "prune older on save"). */
export function pruneDaily(
  daily: Record<string, DailyEntry>,
  now: number,
): Record<string, DailyEntry> {
  const active = dailyEntryAt({ daily }, now);
  if (!active) return daily;
  return Object.fromEntries(
    Object.entries(daily).filter(([, e]) => e.effectiveFrom >= active.effectiveFrom),
  );
}

/** Specials whose last occurrence is before `today` ('YYYY-MM-DD'). */
export function expiredSpecialIds(
  specials: Record<string, SpecialPrayer> | undefined,
  today: string,
): string[] {
  return Object.entries(specials ?? {})
    .filter(([, s]) => {
      const r = s.repeat;
      if (r.kind === 'once') return r.date < today;
      if (r.kind === 'daily') return r.until < today;
      return !!r.until && r.until < today;
    })
    .map(([id]) => id);
}

/** Does a management reminder apply to this special on `date`? (weekly: every, daily: first day, once: the date) */
export function managementOccursOn(s: SpecialPrayer, date: string): boolean {
  const r = s.repeat;
  if (r.kind === 'once') return r.date === date;
  if (r.kind === 'daily') return r.from === date;
  return weekdayOf(date) === r.weekday && r.from <= date && (!r.until || date <= r.until);
}

/** Specials with a management reminder happening tomorrow that aren't confirmed yet (Dashboard "Kal" card). */
export function tomorrowToConfirm(
  masjid: Pick<Masjid, 'specials' | 'timezone'>,
  now: number,
): { id: string; special: SpecialPrayer; date: string }[] {
  const tz = masjid.timezone || DEFAULT_TIMEZONE;
  const tomorrow = addDays(dateKey(now, tz), 1);
  return Object.entries(masjid.specials ?? {})
    .filter(
      ([, s]) =>
        s.remindManagement && s.lastConfirmedFor !== tomorrow && managementOccursOn(s, tomorrow),
    )
    .map(([id, special]) => ({ id, special, date: tomorrow }));
}

export type SpecialDefaults = Pick<
  SpecialPrayer,
  'times' | 'repeat' | 'remindManagement' | 'replacesPrayer' | 'dateConfirmed'
>;

/** Picking a type pre-fills sensible defaults (PLAN §4). */
export function specialDefaults(type: SpecialType, today: string): SpecialDefaults {
  switch (type) {
    case 'jumma':
      return {
        times: { khutba: '13:00', jamaat: '13:30' },
        repeat: { kind: 'weekly', weekday: 5, from: today },
        remindManagement: false,
        replacesPrayer: 'zuhr',
        dateConfirmed: true,
      };
    case 'taraweeh':
      return {
        times: { start: '20:30' },
        repeat: { kind: 'daily', from: today, until: addDays(today, 29) },
        remindManagement: true,
        dateConfirmed: true,
      };
    case 'eid_ul_fitr':
      return {
        times: { first_jamaat: '07:00', second_jamaat: '08:00' },
        repeat: { kind: 'once', date: today },
        remindManagement: true,
        dateConfirmed: false,
      };
    case 'eid_ul_adha':
      return {
        times: { first_jamaat: '06:45', second_jamaat: '07:45' },
        repeat: { kind: 'once', date: today },
        remindManagement: true,
        dateConfirmed: false,
      };
    case 'custom':
      return {
        times: { jamaat: '' },
        repeat: { kind: 'once', date: today },
        remindManagement: true,
        dateConfirmed: true,
      };
  }
}

/** Time fields shown per type. */
export function specialFields(
  type: SpecialType,
): ('khutba' | 'jamaat' | 'first_jamaat' | 'second_jamaat' | 'start')[] {
  if (type === 'jumma') return ['khutba', 'jamaat'];
  if (type === 'taraweeh') return ['start'];
  if (type === 'eid_ul_fitr' || type === 'eid_ul_adha') return ['first_jamaat', 'second_jamaat'];
  return ['jamaat'];
}

export function hasAllPrayers(times: Partial<DailyTimes>): times is DailyTimes {
  return PRAYERS.every((p) => !!times[p]?.jamaat);
}

function sameTime(a: PrayerTime | undefined, b: PrayerTime): boolean {
  return !!a && a.azaan === b.azaan && a.jamaat === b.jamaat;
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
