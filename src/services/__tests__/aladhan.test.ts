import AsyncStorage from '@react-native-async-storage/async-storage';

import fixture from '../__fixtures__/aladhan-calendar-2026-10.json';
import { cacheKey, calendarUrl, getCalculatedTimes, parseCalendar, stripTz } from '../aladhan';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const params = {
  location: { lat: 24.8607, lng: 67.0011 },
  method: 'karachi' as const,
  school: 'hanafi' as const,
  timezone: 'Asia/Karachi',
  year: 2026,
  month: 10,
};

describe('aladhan', () => {
  beforeEach(() => AsyncStorage.clear());

  it('strips the timezone suffix', () => {
    expect(stripTz('05:12 (PKT)')).toBe('05:12');
    expect(stripTz('19:20')).toBe('19:20');
  });

  it('parses the calendar fixture', () => {
    const month = parseCalendar(fixture);
    expect(Object.keys(month)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(month['2026-10-01']).toMatchObject({
      fajr: expect.stringMatching(/^05:\d\d$/),
      asr: expect.any(String),
    });
  });

  it('rejects malformed responses', () => {
    expect(() => parseCalendar({ code: 200, data: [{ timings: {} }] })).toThrow();
    expect(() => parseCalendar({ code: 400, data: 'bad' })).toThrow();
  });

  it('rounds coordinates to 2 decimals in key and URL', () => {
    expect(cacheKey(params)).toBe('aladhan:24.86,67.00:karachi:hanafi:Asia/Karachi:2026-10');
    expect(calendarUrl(params)).toBe(
      'https://api.aladhan.com/v1/calendar/2026/10?latitude=24.86&longitude=67.00&method=1&school=1&timezonestring=Asia%2FKarachi',
    );
  });

  it('fetches once per key, then serves the cache (also offline)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    const settings = {
      method: 'karachi' as const,
      school: 'hanafi' as const,
      timezone: 'Asia/Karachi',
    };
    const a = await getCalculatedTimes(
      { lat: 24.861, lng: 67.004 },
      '2026-10-02',
      settings,
      fetchMock,
    );
    // Nearby masjid shares the rounded key.
    const failing = jest.fn().mockRejectedValue(new Error('offline'));
    const b = await getCalculatedTimes(
      { lat: 24.8612, lng: 67.0012 },
      '2026-10-02',
      settings,
      failing,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(failing).not.toHaveBeenCalled();
    expect(b).toEqual(a);
  });

  it('throws when offline with nothing cached', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(
      getCalculatedTimes(
        { lat: 31.5, lng: 74.3 },
        '2026-10-02',
        { method: 'karachi', school: 'hanafi', timezone: 'Asia/Karachi' },
        failing,
      ),
    ).rejects.toThrow('offline');
  });
});
