import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import type { LatLng } from '@/types/masjid';

/** Fallback when location is denied: central Karachi (same as the seed centre). */
export const DEFAULT_CENTER: LatLng = {
  lat: Number(process.env.EXPO_PUBLIC_DEFAULT_LAT ?? 24.8607),
  lng: Number(process.env.EXPO_PUBLIC_DEFAULT_LNG ?? 67.0011),
};

export type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [location, setLocation] = useState<LatLng | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  const locate = useCallback(async (ask: boolean) => {
    try {
      const perm = ask
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      setCanAskAgain(perm.canAskAgain);
      if (perm.status !== 'granted') {
        setStatus(perm.status === 'undetermined' && !ask ? 'loading' : 'denied');
        return null;
      }
      setStatus('granted');
      const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
      if (last) setLocation({ lat: last.coords.latitude, lng: last.coords.longitude });
      // A first GPS fix can take a while (or never come on some simulators): don't wait forever.
      const cur = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((r) => setTimeout(() => r(null), 15_000)),
      ]);
      if (!cur) {
        setTimedOut(true);
        return last ? { lat: last.coords.latitude, lng: last.coords.longitude } : null;
      }
      const p = { lat: cur.coords.latitude, lng: cur.coords.longitude };
      setLocation(p);
      return p;
    } catch {
      setStatus((s) => (s === 'granted' ? s : 'unavailable'));
      return null;
    }
  }, []);

  useEffect(() => {
    // State is only set after awaited permission/location calls, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void locate(true);
  }, [locate]);

  const requestAgain = useCallback(async () => {
    if (!canAskAgain) {
      await Linking.openSettings();
      return null;
    }
    return locate(true);
  }, [canAskAgain, locate]);

  // Keep following the user so the radius circle moves with them (and late first fixes land).
  useEffect(() => {
    if (status !== 'granted') return;
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    )
      .then((s) => (cancelled ? s.remove() : (sub = s)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [status]);

  return { status, location, timedOut, canAskAgain, refresh: () => locate(false), requestAgain };
}

/** Area search via the platform geocoder (used sparingly: on submit only). */
export async function geocodeArea(text: string): Promise<LatLng | null> {
  try {
    const res = await Location.geocodeAsync(text);
    const first = res[0];
    return first ? { lat: first.latitude, lng: first.longitude } : null;
  } catch {
    return null;
  }
}
