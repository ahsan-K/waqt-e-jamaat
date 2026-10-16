import Supercluster from 'supercluster';

import type { NearbyItem } from './useNearby';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type ClusterPoint =
  | { kind: 'cluster'; id: string; lat: number; lng: number; count: number; expansionZoom: number }
  | { kind: 'masjid'; id: string; lat: number; lng: number; item: NearbyItem };

export function zoomForRegion(r: MapRegion): number {
  return Math.max(0, Math.min(20, Math.round(Math.log2(360 / Math.max(r.longitudeDelta, 1e-6)))));
}

/** Cluster pins with supercluster when zoomed out (PLAN §2 marker clustering). */
export function clusterItems(items: NearbyItem[], region: MapRegion): ClusterPoint[] {
  const index = new Supercluster<{ id: string }>({ radius: 48, maxZoom: 15 });
  const byId = new Map(items.map((i) => [i.id, i]));
  index.load(
    items.map((i) => ({
      type: 'Feature' as const,
      properties: { id: i.id },
      geometry: { type: 'Point' as const, coordinates: [i.lng, i.lat] },
    })),
  );
  const pad = 1.5;
  const bbox: [number, number, number, number] = [
    region.longitude - (region.longitudeDelta * pad) / 2,
    region.latitude - (region.latitudeDelta * pad) / 2,
    region.longitude + (region.longitudeDelta * pad) / 2,
    region.latitude + (region.latitudeDelta * pad) / 2,
  ];
  const zoom = zoomForRegion(region);
  return index.getClusters(bbox, zoom).map((f) => {
    const [lng, lat] = f.geometry.coordinates as [number, number];
    const props = f.properties as {
      cluster?: boolean;
      cluster_id?: number;
      point_count?: number;
      id?: string;
    };
    if (props.cluster && props.cluster_id !== undefined) {
      return {
        kind: 'cluster',
        id: `c${props.cluster_id}`,
        lat,
        lng,
        count: props.point_count ?? 0,
        expansionZoom: index.getClusterExpansionZoom(props.cluster_id),
      };
    }
    const item = byId.get(props.id ?? '')!;
    return { kind: 'masjid', id: item.id, lat, lng, item };
  });
}
