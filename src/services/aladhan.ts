import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import type { AsrSchool, CalcMethod } from '@/store/settings';
import type { HHmm, LatLng } from '@/types/masjid';

/**
 * AlAdhan monthly calendar by coordinates (PLAN §6a):
 * GET https://api.aladhan.com/v1/calendar/{year}/{month}?latitude&longitude&method&school&timezonestring
 * Response: { code: 200, data: [{ timings: { Fajr: "05:15 (PKT)", ... }, date: { gregorian: { date: "DD-MM-YYYY" } } }] }
 */
const BASE = 'https://api.aladhan.com/v1/calendar';

export const METHOD_IDS: Record<CalcMethod, number> = {
  karachi: 1,
  isna: 2,
  mwl: 3,
  ummAlQura: 4,
};
export const SCHOOL_IDS: Record<AsrSchool, number> = { shafi: 0, hanafi: 1 };

export type CalculatedTimes = {
  fajr: HHmm;
  sunrise: HHmm;
  zuhr: HHmm;
  asr: HHmm;
  maghrib: HHmm;
  isha: HHmm;
};
/** date ('YYYY-MM-DD') → times */
export type CalculatedMonth = Record<string, CalculatedTimes>;

const timeString = z.string().regex(/^\d{2}:\d{2}/);
const daySchema = z.object({
  timings: z.object({
    Fajr: timeString,
    Sunrise: timeString,
    Dhuhr: timeString,
    Asr: timeString,
    Maghrib: timeString,
    Isha: timeString,
  }),
  date: z.object({ gregorian: z.object({ date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/) }) }),
});
const responseSchema = z.object({ code: z.literal(200), data: z.array(daySchema) });

/** "05:12 (PKT)" → "05:12" */
export function stripTz(value: string): HHmm {
  return value.trim().slice(0, 5);
}

/** Validate + normalise an AlAdhan calendar response. Pure; unit-tested with a fixture. */
export function parseCalendar(json: unknown): CalculatedMonth {
  const parsed = responseSchema.parse(json);
  const out: CalculatedMonth = {};
  for (const day of parsed.data) {
    const [dd, mm, yyyy] = day.date.gregorian.date.split('-');
    const t = day.timings;
    out[`${yyyy}-${mm}-${dd}`] = {
      fajr: stripTz(t.Fajr),
      sunrise: stripTz(t.Sunrise),
      zuhr: stripTz(t.Dhuhr),
      asr: stripTz(t.Asr),
      maghrib: stripTz(t.Maghrib),
      isha: stripTz(t.Isha),
    };
  }
  return out;
}

export type CalcParams = {
  location: LatLng;
  method: CalcMethod;
  school: AsrSchool;
  timezone: string;
  year: number;
  month: number; // 1-12
};

/** Cache key: coordinates rounded to 2 decimals (~1 km) + method + school + year-month. */
export function cacheKey(p: CalcParams): string {
  const lat = p.location.lat.toFixed(2);
  const lng = p.location.lng.toFixed(2);
  return `aladhan:${lat},${lng}:${p.method}:${p.school}:${p.timezone}:${p.year}-${String(p.month).padStart(2, '0')}`;
}

export function calendarUrl(p: CalcParams): string {
  const qs = new URLSearchParams({
    latitude: p.location.lat.toFixed(2),
    longitude: p.location.lng.toFixed(2),
    method: String(METHOD_IDS[p.method]),
    school: String(SCHOOL_IDS[p.school]),
    timezonestring: p.timezone,
  });
  return `${BASE}/${p.year}/${p.month}?${qs.toString()}`;
}

const inflight = new Map<string, Promise<CalculatedMonth>>();

/**
 * Month of calculated times: AsyncStorage cache first, network once per key.
 * On network failure returns the cached month if any, else throws.
 */
export async function getCalculatedMonth(
  p: CalcParams,
  fetchImpl: typeof fetch = fetch,
): Promise<CalculatedMonth> {
  const key = cacheKey(p);
  const cached = await AsyncStorage.getItem(key).catch(() => null);
  if (cached) return JSON.parse(cached) as CalculatedMonth;

  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const res = await fetchImpl(calendarUrl(p));
    if (!res.ok) throw new Error(`AlAdhan ${res.status}`);
    const month = parseCalendar(await res.json());
    await AsyncStorage.setItem(key, JSON.stringify(month)).catch(() => undefined);
    void pruneOldMonths(p);
    return month;
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Keep only current + next month entries. */
async function pruneOldMonths(p: CalcParams) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keep = new Set([`${p.year}-${String(p.month).padStart(2, '0')}`]);
    const next =
      p.month === 12 ? `${p.year + 1}-01` : `${p.year}-${String(p.month + 1).padStart(2, '0')}`;
    keep.add(next);
    const stale = keys.filter((k) => k.startsWith('aladhan:') && !keep.has(k.slice(-7)));
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {
    // best effort
  }
}

/** Times for one date (or null if the month lacks it). */
export async function getCalculatedTimes(
  location: LatLng,
  date: string,
  settings: { method: CalcMethod; school: AsrSchool; timezone: string },
  fetchImpl?: typeof fetch,
): Promise<CalculatedTimes | null> {
  const [y, m] = date.split('-').map(Number);
  const month = await getCalculatedMonth(
    { location, ...settings, year: y ?? 1970, month: m ?? 1 },
    fetchImpl,
  );
  return month[date] ?? null;
}
