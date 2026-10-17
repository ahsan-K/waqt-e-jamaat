import {
  distanceKm,
  filterByRadius,
  geohashFor,
  radiusBounds,
  roundCenter,
  walkingMinutes,
} from '../geo';

const center = { lat: 24.8607, lng: 67.0011 };

describe('geo', () => {
  it('distance between two Karachi points', () => {
    const d = distanceKm(center, { lat: 24.8697, lng: 67.0011 });
    expect(d).toBeGreaterThan(0.99);
    expect(d).toBeLessThan(1.01);
  });

  it('geohash precision 10 and bounds cover the centre hash', () => {
    const h = geohashFor(center);
    expect(h).toHaveLength(10);
    const bounds = radiusBounds(center, 2);
    expect(bounds.some(([s, e]) => h >= s && h <= e)).toBe(true);
  });

  it('dedupes, filters by true distance and sorts', () => {
    const near = { g: 'x', lat: 24.8617, lng: 67.0011, hasTimings: true };
    const mid = { g: 'y', lat: 24.8707, lng: 67.0011, hasTimings: false };
    const far = { g: 'z', lat: 24.9607, lng: 67.0011, hasTimings: true };
    const hits = filterByRadius(
      [
        { b: mid, a: near },
        { a: near, c: far },
      ],
      center,
      2,
    );
    expect(hits.map((h) => h.id)).toEqual(['a', 'b']);
    expect(hits[0]?.distanceKm).toBeLessThan(hits[1]!.distanceKm);
  });

  it('helpers', () => {
    expect(roundCenter({ lat: 24.86071, lng: 67.00119 })).toEqual({ lat: 24.861, lng: 67.001 });
    expect(walkingMinutes(0.4)).toBe(5);
    expect(walkingMinutes(0)).toBe(1);
  });
});

describe('directionsUrls', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { directionsUrls } = require('../directions') as typeof import('../directions');
  it('builds platform deep links with a web fallback', () => {
    const to = { lat: 24.86, lng: 67.01 };
    expect(directionsUrls(to, 'Masjid-e-Noor', 'ios')[0]).toBe(
      'maps://?daddr=24.86,67.01&q=Masjid-e-Noor&dirflg=w',
    );
    expect(directionsUrls(to, 'X', 'android')[0]).toBe('google.navigation:q=24.86,67.01&mode=w');
    expect(directionsUrls(to, 'X', 'web')).toEqual([
      'https://www.google.com/maps/dir/?api=1&destination=24.86,67.01&travelmode=walking',
    ]);
  });
});

describe('circleBounds', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { circleBounds, distanceKm: d } = require('../geo') as typeof import('../geo');
  it('returns points ~radius away in each direction', () => {
    const c = { lat: 24.86, lng: 67.0 };
    for (const p of circleBounds(c, 2)) expect(Math.abs(d(c, p) - 2)).toBeLessThan(0.02);
  });
});

describe('circlePolygon', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { circlePolygon, distanceKm: d } = require('../geo') as typeof import('../geo');
  it('all points lie on the radius', () => {
    const c = { lat: 24.86, lng: 67.0 };
    const pts = circlePolygon(c, 3, 36);
    expect(pts).toHaveLength(36);
    for (const p of pts) expect(Math.abs(d(c, p) - 3)).toBeLessThan(0.03);
  });
});
