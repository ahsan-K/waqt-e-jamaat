import type { HHmm } from '@/types/masjid';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts of an instant in a timezone. */
export function zonedParts(epochMs: number, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(new Date(epochMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS[get('weekday')] ?? 0,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' of an instant in a timezone. */
export function dateKey(epochMs: number, timeZone: string): string {
  const p = zonedParts(epochMs, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y ?? 1970, month: m ?? 1, day: d ?? 1 };
}

/** Weekday (0 = Sunday) of a calendar date (timezone-independent). */
export function weekdayOf(key: string): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Calendar date ± n days. */
export function addDays(key: string, n: number): string {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day) + n * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Offset (ms) of a timezone at an instant: local wall time − UTC. */
function tzOffset(epochMs: number, timeZone: string): number {
  const p = zonedParts(epochMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

/** Instant of a wall-clock time on a calendar date in a timezone. */
export function zonedTimeToEpoch(key: string, time: HHmm, timeZone: string): number {
  const { year, month, day } = parseDateKey(key);
  const { h, m } = splitHHmm(time);
  const guess = Date.UTC(year, month - 1, day, h, m);
  // Two passes handle DST transitions.
  let result = guess - tzOffset(guess, timeZone);
  result = guess - tzOffset(result, timeZone);
  return result;
}

/** Start of a calendar day in a timezone. */
export function startOfDay(key: string, timeZone: string): number {
  return zonedTimeToEpoch(key, '00:00', timeZone);
}

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isHHmm(v: unknown): v is HHmm {
  return typeof v === 'string' && TIME_RE.test(v);
}

export function splitHHmm(time: HHmm): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

export function toMinutes(time: HHmm): number {
  const { h, m } = splitHHmm(time);
  return h * 60 + m;
}

export function fromMinutes(total: number): HHmm {
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

/** Add minutes to an "HH:mm" (wraps around midnight). */
export function addMinutes(time: HHmm, delta: number): HHmm {
  return fromMinutes(toMinutes(time) + delta);
}

/** "16:45" → "4:45" (+ meridiem separately so the UI can translate it). */
export function to12h(time: HHmm): { text: string; pm: boolean } {
  const { h, m } = splitHHmm(time);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { text: `${h12}:${pad(m)}`, pm: h >= 12 };
}

export function minutesBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.round((toMs - fromMs) / 60000));
}
