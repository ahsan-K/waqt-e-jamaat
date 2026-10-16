import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

/** RTDB reads cached in memory and persisted to AsyncStorage for offline use (PLAN §2). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'rq-cache-v1',
  throttleTime: 2000,
});

export const queryKeys = {
  nearby: (lat: number, lng: number, radiusKm: number) => ['nearby', lat, lng, radiusKm] as const,
  masjid: (id: string) => ['masjid', id] as const,
  stats: (id: string) => ['stats', id] as const,
  calculated: (lat: number, lng: number, method: string, school: string, ym: string) =>
    ['calculated', lat, lng, method, school, ym] as const,
};
