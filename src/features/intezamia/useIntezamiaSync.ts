import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
import { formatTime, masjidName, specialName } from '@/i18n/format';
import { localizeDigits } from '@/lib/digits';
import type { InboxItem } from '@/lib/inbox';
import { planManagementReminders } from '@/lib/reminders';
import { subscribeReports, subscribeRequests, type ReportRow } from '@/services/firebase/intezamia';
import { notifyNow, replaceScheduled } from '@/services/notifications';
import { useInbox } from '@/store/inbox';
import { useSettings } from '@/store/settings';
import type { PrayerKey } from '@/types/masjid';

import { useManagedMasjid } from './useManagedMasjid';

const STATUS_KEY = 'iz-last-status';

/**
 * Intezamia side of PLAN §11: 1-day-before management reminders (19:00), inbox items derived
 * live from /reports and /timingRequests, and an approved / rejected notice.
 */
export function useIntezamiaSync() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const language = useSettings((s) => s.language);
  const { id, masjid } = useManagedMasjid();
  const uid = user?.uid;
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [requests, setRequests] = useState<{ uid: string; at: number }[]>([]);
  const isIntezamia = profile?.role === 'intezamia';

  useEffect(() => {
    if (!id || !isIntezamia) return;
    const a = subscribeReports(id, setReports);
    const b = subscribeRequests(id, setRequests);
    return () => {
      a();
      b();
    };
  }, [id, isIntezamia]);

  const specialsKey = useMemo(() => JSON.stringify(masjid?.specials ?? {}), [masjid?.specials]);

  // Management reminders.
  useEffect(() => {
    if (!uid || !masjid || !isIntezamia) return;
    const run = () => {
      const plan = planManagementReminders(masjid, Date.now());
      const items = plan.map((p) => {
        const s = masjid.specials![p.specialId]!;
        const name = specialName(s, language, t);
        return {
          id: p.id,
          at: p.at,
          title: t('notif.mgmtTitle', { name }),
          body: s.dateConfirmed
            ? `${t('notif.mgmtBody')} ${Object.values(s.times)
                .filter(Boolean)
                .map((v) => formatTime(v!, language))
                .join(' · ')}`
            : t('notif.mgmtEidBody'),
          route: '/dashboard',
        };
      });
      void replaceScheduled('mgmt:', items).catch(() => undefined);
      useInbox.getState().replaceType(
        uid,
        'mgmt:',
        items.map((i): InboxItem => ({ ...i, type: 'reminder' })),
      );
    };
    run();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && run());
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- specialsKey tracks specials changes
  }, [uid, isIntezamia, specialsKey, language]);

  // Reports grouped by prayer + timing requests → inbox (ids stable per group/day so they update in place).
  useEffect(() => {
    if (!uid || !masjid || !isIntezamia) return;
    const items: InboxItem[] = [];
    const byPrayer = new Map<string, ReportRow[]>();
    for (const r of reports) {
      const k = r.prayer ?? '_';
      byPrayer.set(k, [...(byPrayer.get(k) ?? []), r]);
    }
    for (const [prayer, rows] of byPrayer) {
      const latest = Math.max(...rows.map((r) => r.at || 0));
      const n = localizeDigits(rows.length, language);
      items.push({
        id: `report:${prayer}:${rows.length}`,
        type: 'report',
        at: latest,
        title:
          prayer === '_'
            ? t('notif.reportsTitleGeneric', { n })
            : t('notif.reportsTitle', { n, prayer: t(`prayer.${prayer as PrayerKey}`) }),
        body: rows
          .map((r) => r.note)
          .filter(Boolean)
          .slice(0, 2)
          .join(' · '),
        route: '/schedule',
      });
    }
    if (requests.length) {
      items.push({
        id: `request:${requests.length}`,
        type: 'request',
        at: Math.max(...requests.map((r) => r.at || 0)),
        title: t('notif.requestsTitle', { n: localizeDigits(requests.length, language) }),
        body: t('notif.requestsBody'),
        route: '/schedule',
      });
    }
    if (items.length) useInbox.getState().add(uid, items);
  }, [uid, isIntezamia, masjid, reports, requests, language, t]);

  // Approved / rejected notice (once per status change).
  useEffect(() => {
    if (!uid || !masjid || !isIntezamia) return;
    const status = masjid.status;
    void AsyncStorage.getItem(`${STATUS_KEY}:${uid}`).then((prev) => {
      void AsyncStorage.setItem(`${STATUS_KEY}:${uid}`, status);
      if (!prev || prev === status || status === 'pending') return;
      const name = masjidName(masjid, language);
      const item: InboxItem = {
        id: `status:${status}`,
        type: status === 'approved' ? 'approved' : 'rejected',
        at: Date.now(),
        title: t(status === 'approved' ? 'notif.approvedTitle' : 'notif.rejectedTitle', { name }),
        body: t(status === 'approved' ? 'notif.approvedBody' : 'notif.rejectedBody'),
        route: '/dashboard',
      };
      useInbox.getState().add(uid, [item]);
      void notifyNow({ id: item.id, title: item.title, body: item.body, route: item.route }).catch(
        () => undefined,
      );
    });
  }, [uid, isIntezamia, masjid, language, t]);
}
