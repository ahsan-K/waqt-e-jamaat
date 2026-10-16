import {
  addDays,
  addMinutes,
  dateKey,
  fromMinutes,
  isHHmm,
  startOfDay,
  to12h,
  weekdayOf,
  zonedParts,
  zonedTimeToEpoch,
} from '../time';

const TZ = 'Asia/Karachi';

describe('time', () => {
  it('converts wall time in a timezone to epoch and back', () => {
    const at = zonedTimeToEpoch('2026-10-16', '13:30', TZ);
    expect(new Date(at).toISOString()).toBe('2026-10-16T08:30:00.000Z');
    const p = zonedParts(at, TZ);
    expect([p.hour, p.minute, p.weekday]).toEqual([13, 30, 5]);
    expect(dateKey(at, TZ)).toBe('2026-10-16');
  });

  it('handles DST zones', () => {
    // London switches to GMT on 2026-10-25.
    expect(new Date(zonedTimeToEpoch('2026-10-24', '12:00', 'Europe/London')).toISOString()).toBe(
      '2026-10-24T11:00:00.000Z',
    );
    expect(new Date(zonedTimeToEpoch('2026-10-26', '12:00', 'Europe/London')).toISOString()).toBe(
      '2026-10-26T12:00:00.000Z',
    );
  });

  it('date arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekdayOf('2026-10-16')).toBe(5);
    expect(dateKey(startOfDay('2026-10-16', TZ), TZ)).toBe('2026-10-16');
  });

  it('HH:mm helpers', () => {
    expect(isHHmm('05:30')).toBe(true);
    expect(isHHmm('24:00')).toBe(false);
    expect(isHHmm('5:30')).toBe(false);
    expect(addMinutes('23:55', 10)).toBe('00:05');
    expect(addMinutes('00:05', -10)).toBe('23:55');
    expect(fromMinutes(16 * 60 + 45)).toBe('16:45');
    expect(to12h('16:45')).toEqual({ text: '4:45', pm: true });
    expect(to12h('00:10')).toEqual({ text: '12:10', pm: false });
    expect(to12h('12:00')).toEqual({ text: '12:00', pm: true });
  });
});
