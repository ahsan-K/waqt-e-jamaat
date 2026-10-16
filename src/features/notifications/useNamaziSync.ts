import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
import { useMasjids } from '@/features/masjid/queries';
import { formatShortDate, formatTime, masjidName, rowLabel } from '@/i18n/format';
import { findUnseenChanges } from '@/lib/changes';
import { localizeDigits } from '@/lib/digits';
import type { InboxItem } from '@/lib/inbox';
import { planReminders } from '@/lib/reminders';
import { dayRows, hasDailyTimings } from '@/lib/schedule';
import { dateKey } from '@/lib/time';
import { notifyNow, replaceScheduled } from '@/services/notifications';
import { useInbox } from '@/store/inbox';
import { useRequests } from '@/store/requests';
import { useSettings } from '@/store/settings';
import { DEFAULT_TIMEZONE, type Masjid } from '@/types/masjid';

/**
 * Keeps local notifications + inbox in sync for namazis (PLAN §11):
 * jamaat reminders (7 days), timing-change alerts, "masjid added timings".
 * Runs on mount, when favourites / settings / masjid data change and on app foreground.
 */
export function useNamaziSync() {
  const { t } = useTranslation();
  const { user, isRegistered, favourites, profile } = useAuth();
  const uid = user?.uid;
  const language = useSettings((s) => s.language);
  const minutes = useSettings((s) => s.reminderMinutes);
  const changeAlerts = useSettings((s) => s.changeAlerts);
  const requests = useRequests((s) => (uid ? s.byUser[uid] : undefined));
  const markFulfilled = useRequests((s) => s.markFulfilled);

  const favIds = useMemo(() => Object.keys(favourites).sort(), [favourites]);
  const pendingRequestIds = useMemo(
    () =>
      Object.entries(requests ?? {})
        .filter(([, r]) => !r.fulfilled)
        .map(([id]) => id)
        .sort(),
    [requests],
  );
  const ids = useMemo(
    () => [...new Set([...favIds, ...pendingRequestIds])],
    [favIds, pendingRequestIds],
  );
  const masjids = useMasjids(ids);
  const loadedKey = ids
    .map((id) => `${id}:${masjids[id]?.timingsUpdatedAt ?? (masjids[id] ? 0 : '-')}`)
    .join('|');
  const isIntezamia = profile?.role === 'intezamia';
  const favKey = favIds.join(',');
  const requestKey = pendingRequestIds.join(',');

  useEffect(() => {
    if (!uid || isIntezamia) return;
    const run = () => {
      const now = Date.now();
      const inbox = useInbox.getState();
      const loaded = (list: string[]) =>
        list.flatMap((id) => {
          const m = masjids[id];
          return m ? [{ id, masjid: m as Masjid }] : [];
        });

      // 1) Jamaat reminders for favourites with reminderOn.
      if (isRegistered) {
        const withReminder = loaded(favIds.filter((id) => favourites[id]?.reminderOn));
        const plan = planReminders(withReminder, now, minutes);
        const items = plan.map((p) => {
          const m = masjids[p.masjidId]!;
          const tz = m.timezone || DEFAULT_TIMEZONE;
          const row = dayRows(m, dateKey(p.jamaatAt, tz), now).find((r) => r.key === p.rowKey);
          const prayer = row ? rowLabel(row, language, t) : '';
          return {
            id: p.id,
            at: p.at,
            title: t('notif.reminderTitle', { prayer, min: localizeDigits(minutes, language) }),
            body: masjidName(m, language),
            route: `/masjid/${p.masjidId}`,
          };
        });
        void replaceScheduled('jamaat:', items).catch(() => undefined);
        inbox.replaceType(
          uid,
          'jamaat:',
          items.map((i): InboxItem => ({ ...i, type: 'reminder' })),
        );
      } else {
        void replaceScheduled('jamaat:', []).catch(() => undefined);
      }

      // 2) Timing-change alerts for favourites.
      if (isRegistered && changeAlerts) {
        const seen = new Set(inbox.seenChanges[uid] ?? []);
        const changes = findUnseenChanges(loaded(favIds), seen, now);
        if (changes.length) {
          const items = changes.map((c): InboxItem => {
            const m = masjids[c.masjidId]!;
            const tz = m.timezone || DEFAULT_TIMEZONE;
            const prayer = t(`prayer.${c.prayer}`);
            return {
              id: `change:${c.key}`,
              type: 'change',
              at: now,
              title: t('notif.changeTitle', { name: masjidName(m, language), prayer }),
              body: t('notif.changeBody', {
                date: formatShortDate(c.effectiveFrom, tz, language),
                from: c.from ? formatTime(c.from, language) : '—',
                to: formatTime(c.to, language),
              }),
              route: `/masjid/${c.masjidId}`,
            };
          });
          inbox.add(uid, items);
          inbox.markChangesSeen(
            uid,
            changes.map((c) => c.key),
          );
          const first = items[0]!;
          void notifyNow({
            id: first.id,
            title: first.title,
            body: first.body,
            route: first.route,
          }).catch(() => undefined);
        }
      }

      // 3) Requests fulfilled: masjid now has timings.
      for (const id of pendingRequestIds) {
        const m = masjids[id];
        if (!m || !hasDailyTimings(m)) continue;
        const item: InboxItem = {
          id: `added:${id}`,
          type: 'added',
          at: now,
          title: t('notif.addedTitle', { name: masjidName(m, language) }),
          body: t('notif.addedBody'),
          route: `/masjid/${id}`,
        };
        inbox.add(uid, [item]);
        markFulfilled(uid, id);
        if (requests?.[id]?.notify) {
          void notifyNow({
            id: item.id,
            title: item.title,
            body: item.body,
            route: item.route,
          }).catch(() => undefined);
        }
      }
    };
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadedKey captures masjid data changes
  }, [
    uid,
    isRegistered,
    isIntezamia,
    favKey,
    requestKey,
    loadedKey,
    minutes,
    language,
    changeAlerts,
  ]);
}
