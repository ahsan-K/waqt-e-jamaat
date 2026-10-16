import { DEFAULT_TIMEZONE, type Masjid } from '@/types/masjid';

import { dayRows } from './schedule';
import { addDays, dateKey, zonedTimeToEpoch } from './time';

export type PlannedReminder = {
  /** Stable identifier so re-scheduling replaces instead of duplicating. */
  id: string;
  masjidId: string;
  /** Fire time (ms). */
  at: number;
  /** Jamaat time (ms). */
  jamaatAt: number;
  rowKey: string;
  rowKind: 'prayer' | 'special';
};

/**
 * Local jamaat reminders for favourites with reminderOn, `minutesBefore` each jamaat,
 * for the next `days` days (PLAN §11). Skips unconfirmed Eid ("expected") rows.
 * Capped (iOS keeps at most 64 pending local notifications) — soonest first.
 */
export function planReminders(
  favourites: { id: string; masjid: Pick<Masjid, 'daily' | 'specials' | 'timezone'> }[],
  now: number,
  minutesBefore: number,
  days = 7,
  cap = 60,
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const { id, masjid } of favourites) {
    const tz = masjid.timezone || DEFAULT_TIMEZONE;
    const today = dateKey(now, tz);
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      for (const row of dayRows(masjid, date, now)) {
        if (row.kind === 'special' && row.expected) continue;
        const times = row.kind === 'special' ? row.jamaatTimes : [row.jamaat];
        times.forEach((time, idx) => {
          const jamaatAt = zonedTimeToEpoch(date, time, tz);
          const at = jamaatAt - minutesBefore * 60_000;
          if (at <= now) return;
          out.push({
            id: `jamaat:${id}:${date}:${row.key}:${idx}`,
            masjidId: id,
            at,
            jamaatAt,
            rowKey: row.key,
            rowKind: row.kind,
          });
        });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, cap);
}

/**
 * Management reminders (intezamia, PLAN §11): 19:00 local the day before each occurrence of
 * specials with remindManagement. weekly → every occurrence, daily range → only before the
 * first day, once → before the date. Next `days` days only.
 */
export function planManagementReminders(
  masjid: Pick<Masjid, 'specials' | 'timezone'>,
  now: number,
  days = 30,
): { id: string; specialId: string; date: string; at: number }[] {
  const tz = masjid.timezone || DEFAULT_TIMEZONE;
  const today = dateKey(now, tz);
  const out: { id: string; specialId: string; date: string; at: number }[] = [];
  for (const [specialId, s] of Object.entries(masjid.specials ?? {})) {
    if (!s.remindManagement) continue;
    const dates: string[] = [];
    const r = s.repeat;
    if (r.kind === 'once') dates.push(r.date);
    else if (r.kind === 'daily') dates.push(r.from);
    else {
      for (let i = 0; i <= days; i++) {
        const d = addDays(today, i);
        const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
        if (wd === r.weekday && d >= r.from && (!r.until || d <= r.until)) dates.push(d);
      }
    }
    for (const date of dates) {
      if (s.lastConfirmedFor === date) continue;
      const at = zonedTimeToEpoch(addDays(date, -1), '19:00', tz);
      if (at <= now || at > now + days * 86_400_000) continue;
      out.push({ id: `mgmt:${specialId}:${date}`, specialId, date, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
