import type { HHmm } from '@/types/masjid';

import { addDays, zonedTimeToEpoch } from './time';

export const CALC_PRAYERS = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'] as const;
export type CalcPrayer = (typeof CALC_PRAYERS)[number];
export type CalcDay = Record<CalcPrayer, HHmm> & { sunrise?: HHmm };

export type NextCalculated = {
  source: 'calculated';
  prayer: CalcPrayer;
  time: HHmm;
  date: string;
  at: number;
  minutesLeft: number;
};

/**
 * Next calculated prayer start after `now` (AlAdhan fallback, PLAN §6a).
 * Uses tomorrow's Fajr when available, else today's Fajr time as an approximation.
 */
export function nextCalculatedPrayer(
  today: CalcDay,
  tomorrow: CalcDay | null,
  date: string,
  now: number,
  timeZone: string,
): NextCalculated {
  for (const prayer of CALC_PRAYERS) {
    const at = zonedTimeToEpoch(date, today[prayer], timeZone);
    if (at >= now) {
      return {
        source: 'calculated',
        prayer,
        time: today[prayer],
        date,
        at,
        minutesLeft: Math.round((at - now) / 60000),
      };
    }
  }
  const next = addDays(date, 1);
  const time = (tomorrow ?? today).fajr;
  const at = zonedTimeToEpoch(next, time, timeZone);
  return {
    source: 'calculated',
    prayer: 'fajr',
    time,
    date: next,
    at,
    minutesLeft: Math.round((at - now) / 60000),
  };
}

/** Prayer whose time window contains `now` is "current"; used to highlight a table row. */
export function currentCalculatedIndex(
  today: CalcDay,
  date: string,
  now: number,
  timeZone: string,
): number {
  let idx = -1;
  CALC_PRAYERS.forEach((p, i) => {
    if (zonedTimeToEpoch(date, today[p], timeZone) <= now) idx = i;
  });
  return idx;
}
