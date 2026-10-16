import { useQueries, useQuery } from '@tanstack/react-query';

import { nextCalculatedPrayer, type CalcDay, type NextCalculated } from '@/lib/calculated';
import { roundCenter } from '@/lib/geo';
import { addDays, dateKey } from '@/lib/time';
import { getCalculatedMonth, type CalculatedMonth } from '@/services/aladhan';
import { queryKeys } from '@/services/queryClient';
import { useSettings, type AsrSchool, type CalcMethod } from '@/store/settings';
import { DEFAULT_TIMEZONE, type LatLng } from '@/types/masjid';

/** Region default when the user hasn't chosen: Karachi + Hanafi (Pakistan). */
export function useCalcSettings(): { method: CalcMethod; school: AsrSchool } {
  const method = useSettings((s) => s.calcMethod) ?? 'karachi';
  const school = useSettings((s) => s.asrSchool) ?? 'hanafi';
  return { method, school };
}

function monthOf(date: string) {
  const [y, m] = date.split('-').map(Number);
  return { year: y ?? 1970, month: m ?? 1, ym: date.slice(0, 7) };
}

function monthQuery(loc: LatLng, tz: string, method: CalcMethod, school: AsrSchool, date: string) {
  const r = roundCenter(loc, 2);
  const { year, month, ym } = monthOf(date);
  return {
    queryKey: queryKeys.calculated(r.lat, r.lng, method, school, ym),
    queryFn: () => getCalculatedMonth({ location: r, method, school, timezone: tz, year, month }),
    staleTime: Infinity,
    gcTime: 40 * 24 * 60 * 60 * 1000,
    retry: 1,
  };
}

export type CalculatedState = {
  today: CalcDay | null;
  next: NextCalculated | null;
  date: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/** Calculated (AlAdhan) times for a location — only call when the masjid has no timings. */
export function useCalculated(
  loc: LatLng | null,
  now: number,
  timezone: string = DEFAULT_TIMEZONE,
  enabled = true,
): CalculatedState {
  const { method, school } = useCalcSettings();
  const date = dateKey(now, timezone);
  const tomorrowDate = addDays(date, 1);
  const on = enabled && !!loc;
  const base = monthQuery(loc ?? { lat: 0, lng: 0 }, timezone, method, school, date);
  const q = useQuery({ ...base, enabled: on });
  const sameMonth = tomorrowDate.slice(0, 7) === date.slice(0, 7);
  const q2 = useQuery({
    ...monthQuery(loc ?? { lat: 0, lng: 0 }, timezone, method, school, tomorrowDate),
    enabled: on && !sameMonth && !!q.data,
  });
  const today = (q.data as CalculatedMonth | undefined)?.[date] ?? null;
  const tomorrow =
    ((sameMonth ? q.data : q2.data) as CalculatedMonth | undefined)?.[tomorrowDate] ?? null;
  return {
    today,
    next: today ? nextCalculatedPrayer(today, tomorrow, date, now, timezone) : null,
    date,
    isLoading: on && q.isLoading,
    isError: q.isError,
    refetch: () => void q.refetch(),
  };
}

/** Calculated next prayer for several locations at once (map list / pins). */
export function useCalculatedMany(
  locs: { id: string; loc: LatLng }[],
  now: number,
  timezone: string = DEFAULT_TIMEZONE,
): Record<string, NextCalculated | null> {
  const { method, school } = useCalcSettings();
  const date = dateKey(now, timezone);
  const results = useQueries({
    queries: locs.map(({ loc }) => monthQuery(loc, timezone, method, school, date)),
  });
  const out: Record<string, NextCalculated | null> = {};
  locs.forEach(({ id }, i) => {
    const month = results[i]?.data as CalculatedMonth | undefined;
    const today = month?.[date];
    const tomorrow = month?.[addDays(date, 1)] ?? null;
    out[id] = today ? nextCalculatedPrayer(today, tomorrow, date, now, timezone) : null;
  });
  return out;
}
