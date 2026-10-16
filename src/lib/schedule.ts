import {
  DEFAULT_TIMEZONE,
  PRAYERS,
  type DailyEntry,
  type HHmm,
  type Masjid,
  type PrayerKey,
  type SpecialPrayer,
} from '@/types/masjid';

import { addDays, dateKey, startOfDay, toMinutes, weekdayOf, zonedTimeToEpoch } from './time';

export type IdEntry<T> = T & { id: string };

export type ActiveSchedule = {
  active: IdEntry<DailyEntry> | null;
  upcoming: IdEntry<DailyEntry>[];
};

function entries<T>(map: Record<string, T> | undefined): IdEntry<T>[] {
  return Object.entries(map ?? {}).map(([id, v]) => ({ ...v, id }));
}

/** Daily entry in force at an instant: latest `effectiveFrom <= at`. */
export function dailyEntryAt(
  masjid: Pick<Masjid, 'daily'>,
  at: number,
): IdEntry<DailyEntry> | null {
  let best: IdEntry<DailyEntry> | null = null;
  for (const e of entries(masjid.daily)) {
    if (e.effectiveFrom <= at && (!best || e.effectiveFrom > best.effectiveFrom)) best = e;
  }
  return best;
}

/** Active daily entry now + future entries (sorted by effectiveFrom). PLAN §6. */
export function resolveActiveSchedule(masjid: Pick<Masjid, 'daily'>, now: number): ActiveSchedule {
  return {
    active: dailyEntryAt(masjid, now),
    upcoming: entries(masjid.daily)
      .filter((e) => e.effectiveFrom > now)
      .sort((a, b) => a.effectiveFrom - b.effectiveFrom),
  };
}

export function hasDailyTimings(masjid: Pick<Masjid, 'daily'>): boolean {
  return Object.keys(masjid.daily ?? {}).length > 0;
}

/** Whether a special's repeat rule matches a calendar date ('YYYY-MM-DD'). */
export function specialMatches(special: SpecialPrayer, date: string): boolean {
  const r = special.repeat;
  switch (r.kind) {
    case 'once':
      return r.date === date;
    case 'daily':
      return r.from <= date && date <= r.until;
    case 'weekly':
      return weekdayOf(date) === r.weekday && r.from <= date && (!r.until || date <= r.until);
  }
}

export function specialsOn(
  specials: Record<string, SpecialPrayer> | undefined,
  date: string,
): IdEntry<SpecialPrayer>[] {
  return entries(specials).filter((s) => specialMatches(s, date));
}

/** Jamaat times of a special in order (Eid has two). */
export function specialJamaatTimes(s: SpecialPrayer): HHmm[] {
  const t = s.times;
  const list = [t.jamaat, t.first_jamaat, t.second_jamaat].filter((x): x is HHmm => !!x);
  if (list.length === 0 && t.start) list.push(t.start);
  return list;
}

export type ScheduleRow =
  | {
      kind: 'prayer';
      key: PrayerKey;
      azaan: HHmm;
      jamaat: HHmm;
    }
  | {
      kind: 'special';
      key: string; // special id
      special: IdEntry<SpecialPrayer>;
      /** Primary time used for ordering / next jamaat. */
      jamaat: HHmm;
      jamaatTimes: HHmm[];
      /** Unconfirmed Eid: show "expected", no reminders. */
      expected: boolean;
    };

/**
 * Rows for a calendar date: the daily entry in force that day, specials that replace a
 * daily prayer (Jumu'ah → Zuhr) swapped in, others added; sorted by jamaat time.
 */
export function dayRows(
  masjid: Pick<Masjid, 'daily' | 'specials' | 'timezone'>,
  date: string,
  now: number,
): ScheduleRow[] {
  const tz = masjid.timezone || DEFAULT_TIMEZONE;
  const at = Math.max(now, startOfDay(date, tz));
  const entry = dailyEntryAt(masjid, at);
  const specials = specialsOn(masjid.specials, date);
  const replaced = new Set(specials.map((s) => s.replacesPrayer).filter(Boolean));

  const rows: ScheduleRow[] = [];
  if (entry) {
    for (const p of PRAYERS) {
      if (replaced.has(p as 'zuhr' | 'isha')) continue;
      const t = entry.times[p];
      if (t) rows.push({ kind: 'prayer', key: p, azaan: t.azaan, jamaat: t.jamaat });
    }
  }
  for (const s of specials) {
    const times = specialJamaatTimes(s);
    const first = times[0];
    if (!first) continue;
    rows.push({
      kind: 'special',
      key: s.id,
      special: s,
      jamaat: first,
      jamaatTimes: times,
      expected: !s.dateConfirmed,
    });
  }
  return rows.sort((a, b) => toMinutes(a.jamaat) - toMinutes(b.jamaat));
}

export type NextJamaat = {
  source: 'masjid';
  row: ScheduleRow;
  /** The specific jamaat time (Eid's second jamaat may be next). */
  time: HHmm;
  date: string;
  at: number;
  minutesLeft: number;
};

/**
 * Next jamaat at or after `now`, including specials; rolls over to the next days.
 * Returns null when the masjid has no timings at all (PLAN §4 empty states).
 */
export function getNextJamaat(
  masjid: Pick<Masjid, 'daily' | 'specials' | 'timezone'>,
  now: number,
  lookaheadDays = 7,
): NextJamaat | null {
  const tz = masjid.timezone || DEFAULT_TIMEZONE;
  const today = dateKey(now, tz);
  for (let i = 0; i <= lookaheadDays; i++) {
    const date = addDays(today, i);
    let best: NextJamaat | null = null;
    for (const row of dayRows(masjid, date, now)) {
      const times = row.kind === 'special' ? row.jamaatTimes : [row.jamaat];
      for (const time of times) {
        const at = zonedTimeToEpoch(date, time, tz);
        if (at < now) continue;
        if (!best || at < best.at) {
          best = {
            source: 'masjid',
            row,
            time,
            date,
            at,
            minutesLeft: Math.round((at - now) / 60000),
          };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** Upcoming changes for UI chips: per prayer, the first future entry whose time differs. */
export function upcomingChanges(
  masjid: Pick<Masjid, 'daily'>,
  now: number,
): { prayer: PrayerKey; effectiveFrom: number; jamaat: HHmm; azaan: HHmm }[] {
  const { active, upcoming } = resolveActiveSchedule(masjid, now);
  const out: { prayer: PrayerKey; effectiveFrom: number; jamaat: HHmm; azaan: HHmm }[] = [];
  for (const p of PRAYERS) {
    let prev = active?.times[p];
    for (const e of upcoming) {
      const t = e.times[p];
      if (t && (!prev || t.jamaat !== prev.jamaat || t.azaan !== prev.azaan)) {
        out.push({ prayer: p, effectiveFrom: e.effectiveFrom, jamaat: t.jamaat, azaan: t.azaan });
        break;
      }
      prev = t ?? prev;
    }
  }
  return out;
}
