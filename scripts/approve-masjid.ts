/**
 * Usage: npx tsx scripts/approve-masjid.ts <masjidId> [--reject]
 * One multi-path update: /masjids/{id}/status + /geo/{id} (so it appears on the map).
 */
import { adminDb } from './lib/admin';

async function main() {
  const id = process.argv[2];
  const reject = process.argv.includes('--reject');
  if (!id) throw new Error('Usage: npx tsx scripts/approve-masjid.ts <masjidId> [--reject]');
  const snap = await adminDb.ref(`masjids/${id}`).get();
  if (!snap.exists()) throw new Error(`masjid ${id} not found`);
  const m = snap.val() as { geohash: string; lat: number; lng: number; daily?: object };
  const updates: Record<string, unknown> = reject
    ? { [`masjids/${id}/status`]: 'rejected', [`geo/${id}`]: null }
    : {
        [`masjids/${id}/status`]: 'approved',
        [`geo/${id}`]: {
          g: m.geohash,
          lat: m.lat,
          lng: m.lng,
          hasTimings: !!m.daily && Object.keys(m.daily).length > 0,
        },
      };
  await adminDb.ref().update(updates);
  console.log(`${reject ? 'Rejected' : 'Approved'} ${id}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
