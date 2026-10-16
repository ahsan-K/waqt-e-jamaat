import { useQueries, useQuery } from '@tanstack/react-query';

import { fetchMasjid, fetchStats } from '@/services/firebase/masjids';
import { queryKeys } from '@/services/queryClient';
import type { Masjid } from '@/types/masjid';

export function useMasjid(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.masjid(id ?? ''),
    queryFn: () => fetchMasjid(id!),
    enabled: !!id,
  });
}

export function useMasjidStats(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.stats(id ?? ''),
    queryFn: () => fetchStats(id!),
    enabled: !!id,
  });
}

/** Parallel per-id masjid reads, each cached separately (PLAN §6). */
export function useMasjids(ids: string[]): Record<string, Masjid | null | undefined> {
  const results = useQueries({
    queries: ids.map((id) => ({ queryKey: queryKeys.masjid(id), queryFn: () => fetchMasjid(id) })),
  });
  const out: Record<string, Masjid | null | undefined> = {};
  ids.forEach((id, i) => {
    out[id] = results[i]?.data;
  });
  return out;
}
