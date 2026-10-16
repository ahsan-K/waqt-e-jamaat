import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mergeInbox, type InboxItem } from '@/lib/inbox';

type InboxState = {
  /** Local inbox per uid (PLAN §11: AsyncStorage, max 100 items, 30-day retention). */
  byUser: Record<string, InboxItem[]>;
  /** Timing changes already alerted, per uid. */
  seenChanges: Record<string, string[]>;
  /** Intezamia: last time reports / requests were looked at, per uid. */
  lastSeenAt: Record<string, number>;
  add: (uid: string, items: InboxItem[]) => void;
  replaceType: (uid: string, prefix: string, items: InboxItem[]) => void;
  markRead: (uid: string, id: string) => void;
  markAllRead: (uid: string) => void;
  markChangesSeen: (uid: string, keys: string[]) => void;
};

export const useInbox = create<InboxState>()(
  persist(
    (set) => ({
      byUser: {},
      seenChanges: {},
      lastSeenAt: {},
      add: (uid, items) =>
        set((s) => ({
          byUser: { ...s.byUser, [uid]: mergeInbox(s.byUser[uid] ?? [], items, Date.now()) },
        })),
      // Replace all items whose id starts with prefix (e.g. future reminders after re-scheduling).
      replaceType: (uid, prefix, items) =>
        set((s) => {
          const now = Date.now();
          const kept = (s.byUser[uid] ?? []).filter((i) => !i.id.startsWith(prefix) || i.at <= now);
          return { byUser: { ...s.byUser, [uid]: mergeInbox(kept, items, now) } };
        }),
      markRead: (uid, id) =>
        set((s) => ({
          byUser: {
            ...s.byUser,
            [uid]: (s.byUser[uid] ?? []).map((i) =>
              i.id === id ? { ...i, readAt: Date.now() } : i,
            ),
          },
        })),
      markAllRead: (uid) =>
        set((s) => {
          const now = Date.now();
          return {
            byUser: {
              ...s.byUser,
              [uid]: (s.byUser[uid] ?? []).map((i) =>
                i.readAt || i.at > now ? i : { ...i, readAt: now },
              ),
            },
            lastSeenAt: { ...s.lastSeenAt, [uid]: now },
          };
        }),
      markChangesSeen: (uid, keys) =>
        set((s) => ({
          seenChanges: {
            ...s.seenChanges,
            [uid]: [...new Set([...(s.seenChanges[uid] ?? []), ...keys])],
          },
        })),
    }),
    { name: 'inbox-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
