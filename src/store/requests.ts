import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Timing requests this device sent (the user can't read /timingRequests back under the rules). */
type RequestsState = {
  byUser: Record<string, Record<string, { at: number; notify: boolean; fulfilled?: boolean }>>;
  add: (uid: string, masjidId: string, notify: boolean) => void;
  markFulfilled: (uid: string, masjidId: string) => void;
};

export const useRequests = create<RequestsState>()(
  persist(
    (set) => ({
      byUser: {},
      add: (uid, masjidId, notify) =>
        set((s) => ({
          byUser: {
            ...s.byUser,
            [uid]: { ...s.byUser[uid], [masjidId]: { at: Date.now(), notify } },
          },
        })),
      markFulfilled: (uid, masjidId) =>
        set((s) => {
          const cur = s.byUser[uid]?.[masjidId];
          if (!cur) return s;
          return {
            byUser: {
              ...s.byUser,
              [uid]: { ...s.byUser[uid], [masjidId]: { ...cur, fulfilled: true } },
            },
          };
        }),
    }),
    { name: 'requests-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
