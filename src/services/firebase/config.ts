import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEMO_PROJECT = 'demo-waqt-e-jamaat';

export const useEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

/** Firebase web config from env. Falls back to a `demo-*` project when using the emulator. */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || (useEmulator ? 'demo-api-key' : ''),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || `${DEMO_PROJECT}.firebaseapp.com`,
  databaseURL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ||
    `https://${DEMO_PROJECT}-default-rtdb.firebaseio.com`,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || DEMO_PROJECT,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || undefined,
};

if (!useEmulator && !process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
  // Release builds must get the Firebase config from EAS environment variables (RELEASE.md §2).
  console.error('Firebase config missing: set EXPO_PUBLIC_FIREBASE_* or enable the emulator.');
}

/**
 * Host where the Emulator Suite is reachable from the device:
 * explicit env override → Metro dev-server host (works on simulators and LAN devices)
 * → 10.0.2.2 on the Android emulator / localhost on iOS.
 */
export function emulatorHost(): string {
  const override = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (override) return override;
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  const isLoopback = !devHost || devHost === 'localhost' || devHost === '127.0.0.1';
  if (!isLoopback) return devHost;
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}
