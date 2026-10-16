/**
 * Firebase Admin init for local scripts.
 * - Emulator (default): uses the demo project, no credentials needed.
 * - Production: set USE_EMULATOR=false, GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_DATABASE_URL.
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const useEmulator = process.env.USE_EMULATOR !== 'false';
const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-waqt-e-jamaat';

if (useEmulator) {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST ??= '127.0.0.1:9000';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
}

const app = initializeApp({
  projectId,
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ??
    (useEmulator
      ? `http://127.0.0.1:9000?ns=${projectId}-default-rtdb`
      : `https://${projectId}-default-rtdb.firebaseio.com`),
  ...(useEmulator ? {} : { credential: applicationDefault() }),
});

export const adminDb = getDatabase(app);
export const adminAuth = getAuth(app);
export const isEmulator = useEmulator;
