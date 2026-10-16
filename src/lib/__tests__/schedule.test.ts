import type { DailyTimes, Masjid, SpecialPrayer } from '@/types/masjid';

import {
  dayRows,
  getNextJamaat,
  resolveActiveSchedule,
  specialsOn,
  upcomingChanges,
} from '../schedule';
import { zonedTimeToEpoch } from '../time';

const TZ = 'Asia/Karachi';
const at = (date: string, time: string) => zonedTimeToEpoch(date, time, TZ);

const times: DailyTimes = {
  fajr: { azaan: '05:00', jamaat: '05:30' },
  zuhr: { azaan: '12:45', jamaat: '13:30' },
  asr: { azaan: '16:15', jamaat: '16:45' },
  maghrib: { azaan: '17:50', jamaat: '17:55' },
  isha: { azaan: '19:15', jamaat: '20:00' },
};

const jumma: SpecialPrayer = {
  type: 'jumma',
  times: { khutba: '13:00', jamaat: '13:45' },
  repeat: { kind: 'weekly', weekday: 5, from: '2026-01-01' },
  dateConfirmed: true,
  remindManagement: false,
  replacesPrayer: 'zuhr',
  updatedAt: 0,
};

function masjid(extra: Partial<Masjid> = {}): Pick<Masjid, 'daily' | 'specials' | 'timezone'> {
  return {
    timezone: TZ,
    daily: { d1: { effectiveFrom: at('2026-01-01', '00:00'), times, createdBy: 'u' } },
    specials: { j: jumma },
    ...extra,
  };
}

// 2026-10-16 is a Friday, 2026-10-17 a Saturday.
describe('resolveActiveSchedule', () => {
  it('picks the latest entry in force and lists future ones', () => {
    const later = { ...times, fajr: { azaan: '05:10', jamaat: '05:50' } };
    const m = masjid({
      daily: {
        old: { effectiveFrom: at('2025-01-01', '00:00'), times, createdBy: 'u' },
        cur: { effectiveFrom: at('2026-10-01', '00:00'), times, createdBy: 'u' },
        fut: { effectiveFrom: at('2026-11-06', '00:00'), times: later, createdBy: 'u' },
      },
    });
    const r = resolveActiveSchedule(m, at('2026-10-17', '10:00'));
    expect(r.active?.id).toBe('cur');
    expect(r.upcoming.map((e) => e.id)).toEqual(['fut']);
    expect(upcomingChanges(m, at('2026-10-17', '10:00'))).toEqual([
      { prayer: 'fajr', effectiveFrom: at('2026-11-06', '00:00'), jamaat: '05:50', azaan: '05:10' },
    ]);
  });

  it('future effective date applies from that day', () => {
    const later = { ...times, fajr: { azaan: '05:10', jamaat: '05:50' } };
    const m = masjid({
      daily: {
        cur: { effectiveFrom: at('2026-10-01', '00:00'), times, createdBy: 'u' },
        fut: { effectiveFrom: at('2026-10-18', '00:00'), times: later, createdBy: 'u' },
      },
    });
    const now = at('2026-10-17', '10:00');
    const fajr = (date: string) => dayRows(m, date, now).find((r) => r.key === 'fajr');
    expect(fajr('2026-10-17')?.jamaat).toBe('05:30');
    expect(fajr('2026-10-18')?.jamaat).toBe('05:50');
  });
});

describe('specials', () => {
  it("Friday Jumu'ah replaces Zuhr", () => {
    const rows = dayRows(masjid(), '2026-10-16', at('2026-10-16', '08:00'));
    expect(rows.map((r) => r.key)).toEqual(['fajr', 'j', 'asr', 'maghrib', 'isha']);
    const sat = dayRows(masjid(), '2026-10-17', at('2026-10-17', '08:00'));
    expect(sat.map((r) => r.key)).toEqual(['fajr', 'zuhr', 'asr', 'maghrib', 'isha']);
  });

  it('weekly with an end date stops after it', () => {
    const m = masjid({
      specials: {
        j: {
          ...jumma,
          repeat: { kind: 'weekly', weekday: 5, from: '2026-01-01', until: '2026-10-10' },
        },
      },
    });
    expect(specialsOn(m.specials, '2026-10-09')).toHaveLength(1);
    expect(specialsOn(m.specials, '2026-10-16')).toHaveLength(0);
  });

  it('Taraweeh only inside its date range, added as an extra row', () => {
    const taraweeh: SpecialPrayer = {
      type: 'taraweeh',
      times: { start: '20:30' },
      repeat: { kind: 'daily', from: '2027-02-08', until: '2027-03-09' },
      dateConfirmed: true,
      remindManagement: true,
      updatedAt: 0,
    };
    const m = masjid({ specials: { t: taraweeh } });
    expect(specialsOn(m.specials, '2027-02-07')).toHaveLength(0);
    expect(specialsOn(m.specials, '2027-02-08')).toHaveLength(1);
    expect(specialsOn(m.specials, '2027-03-09')).toHaveLength(1);
    expect(specialsOn(m.specials, '2027-03-10')).toHaveLength(0);
    const rows = dayRows(m, '2027-02-10', at('2027-02-10', '00:00'));
    expect(rows.map((r) => r.key)).toEqual(['fajr', 'zuhr', 'asr', 'maghrib', 'isha', 't']);
  });

  it('once-only Eid; unconfirmed Eid is flagged expected', () => {
    const eid: SpecialPrayer = {
      type: 'eid_ul_fitr',
      times: { first_jamaat: '07:00', second_jamaat: '08:00' },
      repeat: { kind: 'once', date: '2027-03-10' },
      dateConfirmed: false,
      remindManagement: true,
      updatedAt: 0,
    };
    const m = masjid({ specials: { e: eid } });
    expect(specialsOn(m.specials, '2027-03-10')).toHaveLength(1);
    expect(specialsOn(m.specials, '2027-03-11')).toHaveLength(0);
    const row = dayRows(m, '2027-03-10', at('2027-03-10', '00:00')).find((r) => r.key === 'e');
    expect(row?.kind === 'special' && row.expected).toBe(true);
    // Second Eid jamaat becomes next once the first has passed.
    const next = getNextJamaat(m, at('2027-03-10', '07:10'));
    expect(next?.row.key).toBe('e');
    expect(next?.time).toBe('08:00');
  });
});

describe('getNextJamaat', () => {
  it('returns the next one today with minutes left', () => {
    const next = getNextJamaat(masjid(), at('2026-10-17', '16:20'));
    expect(next?.row.key).toBe('asr');
    expect(next?.minutesLeft).toBe(25);
  });

  it("uses Jumu'ah on Friday", () => {
    const next = getNextJamaat(masjid(), at('2026-10-16', '12:00'));
    expect(next?.row.key).toBe('j');
    expect(next?.time).toBe('13:45');
  });

  it('rolls over to tomorrow Fajr after Isha', () => {
    const next = getNextJamaat(masjid(), at('2026-10-17', '20:30'));
    expect(next?.row.key).toBe('fajr');
    expect(next?.date).toBe('2026-10-18');
    expect(next?.minutesLeft).toBe(9 * 60);
  });

  it('returns null without timings', () => {
    expect(getNextJamaat({ timezone: TZ }, at('2026-10-17', '10:00'))).toBeNull();
  });
});
