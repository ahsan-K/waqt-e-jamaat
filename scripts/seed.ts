/**
 * Seeds ~15 approved masjids around a Karachi test coordinate (emulator by default).
 * Usage: npm run seed   (env: SEED_CENTER_LAT, SEED_CENTER_LNG)
 * Writes /masjids/{id}, /geo/{id} and /masjidStats/{id}. A few have no timings (grey pins).
 */
import { geohashForLocation } from 'geofire-common';

import { adminDb, isEmulator } from './lib/admin';

const center = {
  lat: Number(process.env.SEED_CENTER_LAT ?? 24.8607),
  lng: Number(process.env.SEED_CENTER_LNG ?? 67.0011),
};

const KM_LAT = 1 / 110.574;
const kmLng = (lat: number) => 1 / (111.32 * Math.cos((lat * Math.PI) / 180));

// [name en, name ur, dxKm, dyKm, hasTimings, jamaat offset minutes]
const MASJIDS: [string, string, number, number, boolean, number][] = [
  ['Masjid-e-Noor', 'مسجدِ نور', 0.4, -0.3, true, 0],
  ['Jamia Masjid Al-Falah', 'جامع مسجد الفلاح', -0.9, 0.5, true, 5],
  ['Masjid-e-Bilal', 'مسجدِ بلال', 1.2, 0.9, true, 15],
  ['Masjid-e-Quba', 'مسجدِ قبا', -1.6, -1.1, true, -5],
  ['Madina Masjid', 'مدینہ مسجد', 2.3, -1.4, true, 0],
  ['Masjid-e-Rehmat', 'مسجدِ رحمت', -2.8, 1.9, true, 15],
  ['Jamia Masjid Usmania', 'جامع مسجد عثمانیہ', 3.4, 2.2, true, 5],
  ['Masjid-e-Ibrahim', 'مسجدِ ابراہیم', -0.2, 3.6, true, 10],
  ['Masjid-e-Ayesha', 'مسجدِ عائشہ', 4.1, -0.8, true, 0],
  ['Masjid-e-Tooba', 'مسجدِ طوبیٰ', 0.8, 1.5, false, 0],
  ['Masjid-e-Farooq-e-Azam', 'مسجدِ فاروقِ اعظم', -1.3, -2.4, false, 0],
  ['Masjid-e-Abu Bakr', 'مسجدِ ابوبکر', 2.0, 3.1, false, 0],
  ['Masjid-e-Ali', 'مسجدِ علی', -3.5, -0.6, true, 10],
  ['Masjid-e-Hamza', 'مسجدِ حمزہ', 1.7, -2.6, true, -5],
  ['Masjid-e-Khizra', 'مسجدِ خضریٰ', -4.4, 2.8, true, 5],
];

const BASE = {
  fajr: ['05:10', '05:40'],
  zuhr: ['12:45', '13:30'],
  asr: ['16:30', '16:45'],
  maghrib: ['18:04', '18:09'],
  isha: ['19:30', '20:00'],
} as const;

function addMin(t: string, d: number) {
  const [h, m] = t.split(':').map(Number);
  const total = (((h! * 60 + m! + d) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

async function main() {
  const now = Date.now();
  const updates: Record<string, unknown> = {};
  // Clear previous seed data (emulator only).
  if (isEmulator) {
    updates.masjids = null;
    updates.geo = null;
    updates.masjidStats = null;
  }
  const seeded: Record<string, unknown> = {};
  MASJIDS.forEach(([en, ur, dx, dy, hasTimings, offset], i) => {
    const id = `seed-${String(i + 1).padStart(2, '0')}`;
    const lat = +(center.lat + dy * KM_LAT * -1).toFixed(6);
    const lng = +(center.lng + dx * kmLng(center.lat)).toFixed(6);
    const geohash = geohashForLocation([lat, lng], 10);
    const times = Object.fromEntries(
      Object.entries(BASE).map(([p, [az, jm]]) => [p, { azaan: az, jamaat: addMin(jm, offset) }]),
    );
    const masjid: Record<string, unknown> = {
      name: { en, ur },
      address: `Block ${i + 1}, Karachi`,
      lat,
      lng,
      geohash,
      timezone: 'Asia/Karachi',
      status: 'approved',
      ownerUid: `seed-owner-${i + 1}`,
      createdAt: now,
    };
    if (hasTimings) {
      masjid.daily = { d1: { effectiveFrom: now - 30 * 864e5, times, createdBy: 'seed' } };
      masjid.specials = {
        jumma: {
          type: 'jumma',
          times: { khutba: '13:00', jamaat: addMin('13:45', offset) },
          repeat: { kind: 'weekly', weekday: 5, from: '2026-01-01' },
          dateConfirmed: true,
          remindManagement: false,
          replacesPrayer: 'zuhr',
          updatedAt: now,
        },
      };
      masjid.timingsUpdatedAt = now - (i % 5) * 864e5;
      // One masjid with an upcoming change in 3 weeks.
      if (i === 0) {
        const later = JSON.parse(JSON.stringify(times));
        later.fajr = { azaan: '05:20', jamaat: '05:50' };
        (masjid.daily as Record<string, unknown>).d2 = {
          effectiveFrom: now + 21 * 864e5,
          times: later,
          createdBy: 'seed',
          notify: true,
        };
      }
    }
    seeded[`masjids/${id}`] = masjid;
    seeded[`geo/${id}`] = { g: geohash, lat, lng, hasTimings };
    seeded[`masjidStats/${id}`] = {
      confirmations: hasTimings ? 3 + ((i * 7) % 20) : 0,
      requests: hasTimings ? 0 : 2 + i,
      favourites: (i * 3) % 11,
    };
  });
  await adminDb.ref().update(updates);
  await adminDb.ref().update(seeded);
  console.log(
    `Seeded ${MASJIDS.length} masjids around ${center.lat},${center.lng}${isEmulator ? ' (emulator)' : ''}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
