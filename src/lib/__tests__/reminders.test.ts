import type { DailyTimes, SpecialPrayer } from '@/types/masjid';

import { findUnseenChanges } from '../changes';
import { groupOf, mergeInbox, unreadCount } from '../inbox';
import { planManagementReminders, planReminders } from '../reminders';
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
const masjid = {
  timezone: TZ,
  daily: { d1: { effectiveFrom: at('2026-01-01', '00:00'), times, createdBy: 'u' } },
};

describe('planReminders', () => {
  it('schedules N minutes before each upcoming jamaat for 7 days', () => {
    const now = at('2026-10-17', '16:40');
    const plan = planReminders([{ id: 'm1', masjid }], now, 10);
    // Asr today (16:35) already passed → first is Maghrib 17:45.
    expect(plan[0]).toMatchObject({ rowKey: 'maghrib', at: at('2026-10-17', '17:45') });
    // 2 left today + 5 × 6 following days.
    expect(plan).toHaveLength(2 + 5 * 6);
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
  });

  it('caps the number of pending notifications', () => {
    const now = at('2026-10-17', '00:00');
    const favs = ['a', 'b', 'c'].map((id) => ({ id, masjid }));
    const plan = planReminders(favs, now, 10, 7, 60);
    expect(plan).toHaveLength(60);
    expect(plan.every((p, i) => i === 0 || plan[i - 1]!.at <= p.at)).toBe(true);
  });

  it('skips unconfirmed Eid', () => {
    const eid: SpecialPrayer = {
      type: 'eid_ul_fitr',
      times: { first_jamaat: '07:00' },
      repeat: { kind: 'once', date: '2026-10-18' },
      dateConfirmed: false,
      remindManagement: true,
      updatedAt: 0,
    };
    const plan = planReminders(
      [{ id: 'm', masjid: { ...masjid, specials: { e: eid } } }],
      at('2026-10-17', '21:00'),
      10,
      2,
    );
    expect(plan.some((p) => p.rowKey === 'e')).toBe(false);
  });
});

describe('planManagementReminders', () => {
  const base = { dateConfirmed: true, updatedAt: 0, times: { jamaat: '13:30' } };
  it('weekly → every occurrence; daily → first day only; once → day before at 19:00', () => {
    const now = at('2026-10-17', '10:00'); // Saturday
    const specials: Record<string, SpecialPrayer> = {
      j: {
        ...base,
        type: 'jumma',
        remindManagement: true,
        repeat: { kind: 'weekly', weekday: 5, from: '2026-01-01' },
      },
      t: {
        ...base,
        type: 'taraweeh',
        remindManagement: true,
        repeat: { kind: 'daily', from: '2026-10-20', until: '2026-11-18' },
      },
      e: {
        ...base,
        type: 'eid_ul_adha',
        remindManagement: true,
        repeat: { kind: 'once', date: '2026-10-25' },
      },
      off: {
        ...base,
        type: 'custom',
        remindManagement: false,
        repeat: { kind: 'once', date: '2026-10-19' },
      },
    };
    const plan = planManagementReminders({ timezone: TZ, specials }, now, 14);
    expect(plan.filter((p) => p.specialId === 't').map((p) => p.date)).toEqual(['2026-10-20']);
    expect(plan.filter((p) => p.specialId === 'j').map((p) => p.date)).toEqual([
      '2026-10-23',
      '2026-10-30',
    ]);
    expect(plan.find((p) => p.specialId === 'e')?.at).toBe(at('2026-10-24', '19:00'));
    expect(plan.some((p) => p.specialId === 'off')).toBe(false);
  });

  it('skips an occurrence already confirmed', () => {
    const plan = planManagementReminders(
      {
        timezone: TZ,
        specials: {
          e: {
            ...base,
            type: 'eid_ul_adha',
            remindManagement: true,
            lastConfirmedFor: '2026-10-25',
            repeat: { kind: 'once', date: '2026-10-25' },
          },
        },
      },
      at('2026-10-17', '10:00'),
    );
    expect(plan).toHaveLength(0);
  });
});

describe('inbox', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  it('merges, keeps read state, prunes old and caps', () => {
    const a = {
      id: 'a',
      type: 'reminder' as const,
      title: 'A',
      body: '',
      at: now - 1000,
      readAt: now,
    };
    const old = {
      id: 'o',
      type: 'change' as const,
      title: 'O',
      body: '',
      at: now - 40 * 86_400_000,
    };
    const merged = mergeInbox(
      [a, old],
      [
        { ...a, title: 'A2', readAt: undefined },
        { id: 'b', type: 'added', title: 'B', body: '', at: now },
      ],
      now,
    );
    expect(merged.map((i) => i.id)).toEqual(['b', 'a']);
    expect(merged[1]).toMatchObject({ title: 'A2', readAt: now });
    expect(unreadCount(merged, now)).toBe(1);
  });

  it('groups by day', () => {
    expect(groupOf('2026-10-17', '2026-10-17', '2026-10-16')).toBe('today');
    expect(groupOf('2026-10-16', '2026-10-17', '2026-10-16')).toBe('yesterday');
    expect(groupOf('2026-10-12', '2026-10-17', '2026-10-16')).toBe('week');
    expect(groupOf('2026-09-01', '2026-10-17', '2026-10-16')).toBe('older');
  });
});

describe('findUnseenChanges', () => {
  it('reports upcoming jamaat changes not yet seen', () => {
    const later = { ...times, isha: { azaan: '19:15', jamaat: '19:45' } };
    const m = {
      daily: {
        d1: { effectiveFrom: at('2026-01-01', '00:00'), times, createdBy: 'u' },
        d2: {
          effectiveFrom: at('2026-11-06', '00:00'),
          times: later,
          createdBy: 'u',
          notify: true,
        },
      },
    };
    const now = at('2026-10-17', '10:00');
    const changes = findUnseenChanges([{ id: 'm1', masjid: m }], new Set(), now);
    expect(changes).toEqual([
      expect.objectContaining({ key: 'm1:d2:isha', prayer: 'isha', from: '20:00', to: '19:45' }),
    ]);
    expect(findUnseenChanges([{ id: 'm1', masjid: m }], new Set(['m1:d2:isha']), now)).toHaveLength(
      0,
    );
  });

  it('ignores changes the manager chose not to announce', () => {
    const later = { ...times, isha: { azaan: '19:15', jamaat: '19:45' } };
    const m = {
      daily: {
        d1: { effectiveFrom: 0, times, createdBy: 'u' },
        d2: {
          effectiveFrom: at('2026-11-06', '00:00'),
          times: later,
          createdBy: 'u',
          notify: false,
        },
      },
    };
    expect(
      findUnseenChanges([{ id: 'm1', masjid: m }], new Set(), at('2026-10-17', '10:00')),
    ).toHaveLength(0);
  });
});
