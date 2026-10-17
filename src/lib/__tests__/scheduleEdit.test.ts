import type { DailyTimes, SpecialPrayer } from '@/types/masjid';

import { dayRows } from '../schedule';
import {
  applyDailyChange,
  expiredSpecialIds,
  specialDefaults,
  tomorrowToConfirm,
} from '../scheduleEdit';
import { zonedTimeToEpoch } from '../time';

const TZ = 'Asia/Karachi';
const at = (d: string, t: string) => zonedTimeToEpoch(d, t, TZ);
const times: DailyTimes = {
  fajr: { azaan: '05:00', jamaat: '05:30' },
  zuhr: { azaan: '12:45', jamaat: '13:30' },
  asr: { azaan: '16:15', jamaat: '16:45' },
  maghrib: { azaan: '17:50', jamaat: '17:55' },
  isha: { azaan: '19:15', jamaat: '20:00' },
};
let n = 0;
const opts = (now: number) => ({ now, uid: 'u', notify: true, newId: () => `n${++n}` });

describe('applyDailyChange', () => {
  const m = {
    timezone: TZ,
    daily: {
      old: { effectiveFrom: at('2026-01-01', '00:00'), times, createdBy: 'u' },
      cur: { effectiveFrom: at('2026-10-01', '00:00'), times, createdBy: 'u' },
    },
  };
  const now = at('2026-10-17', '10:00');

  it('Foran updates the active entry and prunes older ones', () => {
    const daily = applyDailyChange(
      m,
      'isha',
      { azaan: '19:15', jamaat: '19:45' },
      { kind: 'now' },
      opts(now),
    );
    expect(Object.keys(daily)).toEqual(['cur']);
    expect(daily.cur!.times.isha.jamaat).toBe('19:45');
  });

  it('Kal se adds an entry from tomorrow with only that prayer changed', () => {
    const daily = applyDailyChange(
      m,
      'fajr',
      { azaan: '05:10', jamaat: '05:50' },
      { kind: 'tomorrow' },
      opts(now),
    );
    const rowsToday = dayRows({ ...m, daily }, '2026-10-17', now);
    const rowsTomorrow = dayRows({ ...m, daily }, '2026-10-18', now);
    expect(rowsToday.find((r) => r.key === 'fajr')?.jamaat).toBe('05:30');
    expect(rowsTomorrow.find((r) => r.key === 'fajr')?.jamaat).toBe('05:50');
    expect(rowsTomorrow.find((r) => r.key === 'isha')?.jamaat).toBe('20:00');
    const added = Object.values(daily).find((e) => e.effectiveFrom === at('2026-10-18', '00:00'));
    expect(added?.notify).toBe(true);
  });

  it('a second change on the same future date edits that entry', () => {
    const d1 = applyDailyChange(
      m,
      'fajr',
      { azaan: '05:10', jamaat: '05:50' },
      { kind: 'date', date: '2026-11-06' },
      opts(now),
    );
    const d2 = applyDailyChange(
      { ...m, daily: d1 },
      'isha',
      { azaan: '19:15', jamaat: '19:45' },
      { kind: 'date', date: '2026-11-06' },
      opts(now),
    );
    const future = Object.values(d2).filter((e) => e.effectiveFrom > now);
    expect(future).toHaveLength(1);
    expect(future[0]!.times.fajr.jamaat).toBe('05:50');
    expect(future[0]!.times.isha.jamaat).toBe('19:45');
  });

  it('creates the first entry when the masjid has none', () => {
    const daily = applyDailyChange(
      { timezone: TZ },
      'fajr',
      { azaan: '05:00', jamaat: '05:20' },
      { kind: 'now' },
      opts(now),
    );
    const entries = Object.values(daily);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.times.fajr.jamaat).toBe('05:20');
    expect(entries[0]!.times.isha.jamaat).toBeTruthy();
  });
});

describe('specials housekeeping', () => {
  const base = {
    dateConfirmed: true,
    updatedAt: 0,
    times: { jamaat: '13:30' },
    type: 'custom' as const,
  };
  it('finds expired one-off / ranged specials', () => {
    const specials: Record<string, SpecialPrayer> = {
      past: { ...base, remindManagement: false, repeat: { kind: 'once', date: '2026-10-01' } },
      future: { ...base, remindManagement: false, repeat: { kind: 'once', date: '2026-11-01' } },
      rangeDone: {
        ...base,
        remindManagement: false,
        repeat: { kind: 'daily', from: '2026-03-01', until: '2026-03-30' },
      },
      weeklyForever: {
        ...base,
        remindManagement: false,
        repeat: { kind: 'weekly', weekday: 5, from: '2026-01-01' },
      },
    };
    expect(expiredSpecialIds(specials, '2026-10-17').sort()).toEqual(['past', 'rangeDone']);
  });

  it('Kal card: tomorrow occurrence with reminder, until confirmed', () => {
    const now = at('2026-10-22', '20:00'); // Thursday
    const specials: Record<string, SpecialPrayer> = {
      j: {
        ...base,
        type: 'jumma',
        remindManagement: true,
        repeat: { kind: 'weekly', weekday: 5, from: '2026-01-01' },
      },
      quiet: {
        ...base,
        type: 'jumma',
        remindManagement: false,
        repeat: { kind: 'weekly', weekday: 5, from: '2026-01-01' },
      },
    };
    expect(tomorrowToConfirm({ timezone: TZ, specials }, now).map((x) => x.id)).toEqual(['j']);
    specials.j = { ...specials.j!, lastConfirmedFor: '2026-10-23' };
    expect(tomorrowToConfirm({ timezone: TZ, specials }, now)).toHaveLength(0);
  });

  it('type defaults', () => {
    expect(specialDefaults('jumma', '2026-10-17')).toMatchObject({
      replacesPrayer: 'zuhr',
      remindManagement: false,
      repeat: { kind: 'weekly', weekday: 5 },
    });
    expect(specialDefaults('eid_ul_fitr', '2026-10-17')).toMatchObject({
      dateConfirmed: false,
      remindManagement: true,
      repeat: { kind: 'once' },
    });
    expect(specialDefaults('taraweeh', '2026-10-17').repeat).toEqual({
      kind: 'daily',
      from: '2026-10-17',
      until: '2026-11-15',
    });
  });
});
