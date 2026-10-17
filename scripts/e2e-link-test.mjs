/**
 * Emulator check for PLAN §7: a guest (anonymous) user who registers keeps the same uid
 * (credential linked), and can then write favourites (guests cannot).
 * Usage: npm run emulators  (in another terminal), then  node scripts/e2e-link-test.mjs
 */
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  EmailAuthProvider,
  getAuth,
  linkWithCredential,
  signInAnonymously,
} from 'firebase/auth';
import {
  connectDatabaseEmulator,
  getDatabase,
  increment,
  ref,
  serverTimestamp,
  update,
} from 'firebase/database';

const app = initializeApp({
  apiKey: 'demo-api-key',
  projectId: 'demo-waqt-e-jamaat',
  databaseURL: 'https://demo-waqt-e-jamaat-default-rtdb.firebaseio.com',
});
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const db = getDatabase(app);
connectDatabaseEmulator(db, '127.0.0.1', 9000);

const favWrite = (uid) =>
  update(ref(db), {
    [`favorites/${uid}/seed-01`]: { reminderOn: true, createdAt: serverTimestamp() },
    'masjidStats/seed-01/favourites': increment(1),
  });

let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failed = true;
};

const guest = (await signInAnonymously(auth)).user;
const guestWrite = await favWrite(guest.uid).then(
  () => true,
  () => false,
);
check(!guestWrite, 'guest cannot write favourites');

const email = `link${Date.now()}@example.com`;
const linked = (await linkWithCredential(guest, EmailAuthProvider.credential(email, 'secret123')))
  .user;
check(linked.uid === guest.uid, 'registering links the credential to the same uid');
check(!linked.isAnonymous, 'linked user is no longer anonymous');

const regWrite = await favWrite(linked.uid).then(
  () => true,
  (e) => (console.log(e.message), false),
);
check(regWrite, 'registered user can write favourite + counter in one update');

process.exit(failed ? 1 : 0);
