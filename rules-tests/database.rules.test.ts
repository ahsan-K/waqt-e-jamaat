/**
 * RTDB security rules (PLAN §8) against the emulator.
 * Run: npm run emulators (or emulators:exec) then npm run test:rules
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inc = (n: number) => ({ '.sv': { increment: n } });
const TS = { '.sv': 'timestamp' };
const times = {
  fajr: { azaan: '05:10', jamaat: '05:40' },
  zuhr: { azaan: '12:45', jamaat: '13:30' },
  asr: { azaan: '16:30', jamaat: '16:45' },
  maghrib: { azaan: '18:04', jamaat: '18:09' },
  isha: { azaan: '19:30', jamaat: '20:00' },
};
const masjid = (owner: string, status: 'pending' | 'approved') => ({
  name: { en: 'Masjid', ur: 'مسجد' },
  address: 'Karachi',
  lat: 24.86,
  lng: 67.0,
  geohash: 'tkrtktu8nd',
  timezone: 'Asia/Karachi',
  status,
  ownerUid: owner,
  createdAt: 1,
  daily: { d1: { effectiveFrom: 1, times, createdBy: owner } },
});

let env: RulesTestEnvironment;
const db = (ctx: RulesTestContext) => ctx.database();
/** push() returns a thenable ref; wrap it so assertFails/assertSucceeds get a real Promise. */
const pushP = (ctx: RulesTestContext, path: string, v: object) =>
  Promise.resolve(db(ctx).ref(path).push(v)).then(() => undefined);
const alice = () =>
  env.authenticatedContext('alice', { firebase: { sign_in_provider: 'password' } });
const bob = () => env.authenticatedContext('bob', { firebase: { sign_in_provider: 'password' } });
const guest = () =>
  env.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } });
const owner = () =>
  env.authenticatedContext('owner', { firebase: { sign_in_provider: 'password' } });
const admin = () =>
  env.authenticatedContext('admin', { admin: true, firebase: { sign_in_provider: 'password' } });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-waqt-e-jamaat',
    database: {
      host: '127.0.0.1',
      port: 9000,
      rules: readFileSync(resolve(__dirname, '../database.rules.json'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .database()
      .ref()
      .update({
        'masjids/m1': masjid('owner', 'approved'),
        'masjids/p1': masjid('owner', 'pending'),
        'geo/m1': { g: 'tkrtktu8nd', lat: 24.86, lng: 67.0, hasTimings: true },
      });
  });
});

describe('discovery & reads', () => {
  it('anyone can query /geo by g; nobody can list /masjids', async () => {
    const u = env.unauthenticatedContext();
    await assertSucceeds(db(u).ref('geo').orderByChild('g').startAt('tkr').endAt('tkr').get());
    await assertFails(db(u).ref('masjids').get());
  });

  it('approved masjids are public, pending ones only for owner/admin', async () => {
    await assertSucceeds(db(env.unauthenticatedContext()).ref('masjids/m1').get());
    await assertFails(db(alice()).ref('masjids/p1').get());
    await assertSucceeds(db(owner()).ref('masjids/p1').get());
    await assertSucceeds(db(admin()).ref('masjids/p1').get());
  });
});

describe('masjid create / update', () => {
  it('a registered user can create a pending masjid they own (with their user doc)', async () => {
    await assertSucceeds(
      db(alice())
        .ref()
        .update({
          'users/alice': { role: 'intezamia', name: 'A', masjidId: 'new1', createdAt: TS },
          'masjids/new1': masjid('alice', 'pending'),
        }),
    );
  });

  it('cannot create an approved masjid, one owned by someone else, or as a guest', async () => {
    await assertFails(db(alice()).ref('masjids/x').set(masjid('alice', 'approved')));
    await assertFails(db(alice()).ref('masjids/x').set(masjid('bob', 'pending')));
    await assertFails(db(guest()).ref('masjids/x').set(masjid('guest', 'pending')));
  });

  it('owner edits timings but not status / location; others cannot edit', async () => {
    await assertSucceeds(db(owner()).ref('masjids/m1/daily/d1/times/isha/jamaat').set('20:15'));
    await assertFails(db(owner()).ref('masjids/p1/status').set('approved'));
    await assertFails(db(owner()).ref('masjids/m1/lat').set(25));
    await assertFails(db(owner()).ref('masjids/m1/geohash').set('abc'));
    await assertFails(db(bob()).ref('masjids/m1/daily/d1/times/isha/jamaat').set('20:15'));
  });

  it('time strings and specials are validated', async () => {
    await assertFails(db(owner()).ref('masjids/m1/daily/d1/times/isha/jamaat').set('8pm'));
    await assertFails(db(owner()).ref('masjids/m1/daily/d1/times/isha/jamaat').set('24:00'));
    const special = {
      type: 'jumma',
      times: { khutba: '13:00', jamaat: '13:30' },
      repeat: { kind: 'weekly', weekday: 5, from: '2026-01-01' },
      dateConfirmed: true,
      remindManagement: false,
      replacesPrayer: 'zuhr',
      updatedAt: 1,
    };
    await assertSucceeds(db(owner()).ref('masjids/m1/specials/j').set(special));
    await assertFails(
      db(owner())
        .ref('masjids/m1/specials/j2')
        .set({ ...special, type: 'party' }),
    );
    await assertFails(
      db(owner())
        .ref('masjids/m1/specials/j3')
        .set({ ...special, repeat: { kind: 'daily', from: '2026-01-01' } }),
    );
    await assertFails(db(owner()).ref('masjids/m1/name/en').set('x'.repeat(81)));
  });

  it('admin approves with status + /geo in one update; owner may only flip hasTimings', async () => {
    await assertSucceeds(
      db(admin())
        .ref()
        .update({
          'masjids/p1/status': 'approved',
          'geo/p1': { g: 'tkrtktu8nd', lat: 24.86, lng: 67.0, hasTimings: true },
        }),
    );
    await assertSucceeds(db(owner()).ref('geo/m1/hasTimings').set(false));
    await assertFails(db(owner()).ref('geo/m1/lat').set(1));
    await assertFails(db(owner()).ref('geo/p2/hasTimings').set(true)); // no geo node
    await assertFails(db(bob()).ref('geo/m1/hasTimings').set(false));
  });
});

describe('favourites & counters', () => {
  it('guests cannot write favourites', async () => {
    await assertFails(
      db(guest()).ref('favorites/guest/m1').set({ reminderOn: true, createdAt: TS }),
    );
  });

  it('favourite + increment(1) in one update; unfavourite + increment(-1)', async () => {
    await assertSucceeds(
      db(alice())
        .ref()
        .update({
          'favorites/alice/m1': { reminderOn: true, createdAt: TS },
          'masjidStats/m1/favourites': inc(1),
        }),
    );
    await assertSucceeds(
      db(alice())
        .ref()
        .update({ 'favorites/alice/m1': null, 'masjidStats/m1/favourites': inc(-1) }),
    );
  });

  it('counter cannot move without the matching favourite change', async () => {
    await assertFails(db(alice()).ref('masjidStats/m1/favourites').set(inc(1)));
    await assertFails(db(alice()).ref('masjidStats/m1/favourites').set(inc(-1)));
    await assertFails(db(alice()).ref('masjidStats/m1/favourites').set(100));
  });

  it("users can't read others' favourites", async () => {
    await assertFails(db(bob()).ref('favorites/alice').get());
  });
});

describe('confirmations, requests, reports', () => {
  it('one confirmation per user, with the counter, approved masjids only', async () => {
    const c = { at: TS, timingsVersion: 1 };
    await assertSucceeds(
      db(alice())
        .ref()
        .update({ 'confirmations/m1/alice': c, 'masjidStats/m1/confirmations': inc(1) }),
    );
    await assertFails(
      db(alice())
        .ref()
        .update({ 'confirmations/m1/alice': c, 'masjidStats/m1/confirmations': inc(1) }),
    );
    await assertFails(db(alice()).ref('masjidStats/m1/confirmations').set(inc(1)));
    await assertFails(db(bob()).ref('confirmations/p1/bob').set(c));
    await assertFails(db(guest()).ref('confirmations/m1/guest').set(c));
  });

  it('guests may request timings once; only the owner reads requests', async () => {
    await assertSucceeds(
      db(guest())
        .ref()
        .update({
          'timingRequests/m1/guest': { at: TS, notifyWhenAdded: true },
          'masjidStats/m1/requests': inc(1),
        }),
    );
    await assertFails(db(guest()).ref('timingRequests/m1/guest').set({ at: TS }));
    await assertSucceeds(db(owner()).ref('timingRequests/m1').get());
    await assertFails(db(bob()).ref('timingRequests/m1').get());
  });

  it('reports: own uid, validated, readable by owner only', async () => {
    await assertSucceeds(
      pushP(alice(), 'reports/m1', { uid: 'alice', at: TS, prayer: 'isha', note: '7:45' }),
    );
    await assertFails(pushP(alice(), 'reports/m1', { uid: 'bob', at: TS }));
    await assertFails(pushP(alice(), 'reports/m1', { uid: 'alice', at: TS, prayer: 'tahajjud' }));
    await assertFails(
      pushP(alice(), 'reports/m1', { uid: 'alice', at: TS, note: 'x'.repeat(501) }),
    );
    await assertSucceeds(db(owner()).ref('reports/m1').get());
    await assertFails(db(alice()).ref('reports/m1').get());
  });
});

describe('users', () => {
  it('own profile only, validated fields', async () => {
    await assertSucceeds(
      db(alice())
        .ref('users/alice')
        .update({ role: 'namazi', reminderMinutes: 10, language: 'ur' }),
    );
    await assertFails(db(alice()).ref('users/bob').update({ role: 'namazi' }));
    await assertFails(db(alice()).ref('users/alice/role').set('admin'));
    await assertFails(db(alice()).ref('users/alice/reminderMinutes').set(7));
    await assertFails(db(alice()).ref('users/alice/isAdmin').set(true));
  });
});
