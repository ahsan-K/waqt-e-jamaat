import { nextCalculatedPrayer } from '../calculated';
import { zonedTimeToEpoch } from '../time';

const TZ = 'Asia/Karachi';
const day = {
  fajr: '05:15',
  sunrise: '06:31',
  zuhr: '12:17',
  asr: '16:26',
  maghrib: '18:04',
  isha: '19:20',
};
const tomorrow = { ...day, fajr: '05:16' };

describe('nextCalculatedPrayer', () => {
  it('finds the next prayer today', () => {
    const n = nextCalculatedPrayer(
      day,
      tomorrow,
      '2026-10-17',
      zonedTimeToEpoch('2026-10-17', '14:00', TZ),
      TZ,
    );
    expect(n).toMatchObject({
      source: 'calculated',
      prayer: 'asr',
      time: '16:26',
      minutesLeft: 146,
    });
  });

  it('rolls to tomorrow Fajr after Isha', () => {
    const n = nextCalculatedPrayer(
      day,
      tomorrow,
      '2026-10-17',
      zonedTimeToEpoch('2026-10-17', '21:00', TZ),
      TZ,
    );
    expect(n).toMatchObject({ prayer: 'fajr', time: '05:16', date: '2026-10-18' });
  });

  it("falls back to today's Fajr time without tomorrow's data", () => {
    const n = nextCalculatedPrayer(
      day,
      null,
      '2026-10-31',
      zonedTimeToEpoch('2026-10-31', '21:00', TZ),
      TZ,
    );
    expect(n).toMatchObject({ prayer: 'fajr', time: '05:15', date: '2026-11-01' });
  });
});
