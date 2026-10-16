import type { LatLng } from '@/types/masjid';

/** Native maps deep links for walking directions (pure, platform passed in for testability). */
export function directionsUrls(
  to: LatLng,
  label: string,
  platform: 'ios' | 'android' | string,
): string[] {
  const dest = `${to.lat},${to.lng}`;
  const q = encodeURIComponent(label);
  const web = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
  if (platform === 'ios') return [`maps://?daddr=${dest}&q=${q}&dirflg=w`, web];
  if (platform === 'android')
    return [`google.navigation:q=${dest}&mode=w`, `geo:${dest}?q=${dest}(${q})`, web];
  return [web];
}
