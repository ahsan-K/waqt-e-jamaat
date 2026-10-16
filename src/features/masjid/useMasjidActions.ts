import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { GateReason } from '@/components/SignInSheet';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  confirmTimings,
  reportTiming,
  requestTimings,
  setFavourite,
  setReminder,
  subscribeConfirmation,
} from '@/services/firebase/namazi';
import { ensurePermission } from '@/services/notifications';
import { useRequests } from '@/store/requests';
import type { Masjid, PrayerKey } from '@/types/masjid';

/** Namazi actions on a masjid; guests are gated behind the sign-in sheet (PLAN §4, §7). */
export function useMasjidActions(
  id: string | undefined,
  masjid: Masjid | null,
  openGate: (r: GateReason) => void,
) {
  const { t } = useTranslation();
  const { user, isRegistered, favourites } = useAuth();
  const uid = user?.uid;
  const fav = id ? favourites[id] : undefined;
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedNow, setConfirmedNow] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const request = useRequests((s) => (uid && id ? s.byUser[uid]?.[id] : undefined));
  const addRequest = useRequests((s) => s.add);

  useEffect(() => {
    if (!uid || !id || !isRegistered) return;
    return subscribeConfirmation(uid, id, setConfirmed);
  }, [uid, id, isRegistered]);

  const guard = (reason: GateReason, fn: () => Promise<void> | void) => () => {
    if (!isRegistered || !uid || !id) {
      openGate(reason);
      return;
    }
    void Promise.resolve(fn()).catch((e: unknown) => {
      console.warn('[masjid action]', e);
      Alert.alert(t('common.error'), __DEV__ ? String((e as Error)?.message ?? e) : undefined);
    });
  };

  return {
    isFavourite: !!fav,
    reminderOn: !!fav?.reminderOn,
    notifyWhenAdded: !!request?.notify,
    requested: !!request,
    confirmed,
    confirmedNow,
    reportOpen,
    closeReport: () => setReportOpen(false),
    toggleFavourite: guard('favourite', async () => {
      await setFavourite(uid!, id!, !fav);
      if (!fav) await ensurePermission();
    }),
    toggleReminder: guard('reminder', async () => {
      if (!fav) {
        // Turning on a reminder favourites the masjid with reminder on.
        await setFavourite(uid!, id!, true);
      } else {
        await setReminder(uid!, id!, !fav.reminderOn);
      }
      if (!fav?.reminderOn && !(await ensurePermission()))
        Alert.alert(t('common.permissionDenied'));
    }),
    confirm: guard('confirm', async () => {
      if (confirmed) return;
      await confirmTimings(uid!, id!, masjid?.timingsUpdatedAt ?? 0);
      setConfirmed(true);
      setConfirmedNow(true);
    }),
    // Guests may ask a masjid to add timings (rules allow any signed-in user).
    request: async () => {
      if (!uid || !id || request) return;
      await requestTimings(uid, id, false).catch(() => undefined);
      addRequest(uid, id, false);
    },
    toggleNotifyWhenAdded: async () => {
      if (!uid || !id) return;
      if (!request) await requestTimings(uid, id, true).catch(() => undefined);
      addRequest(uid, id, true);
      await ensurePermission();
    },
    report: () => setReportOpen(true),
    submitReport: async (data: { prayer?: PrayerKey; note?: string }) => {
      if (!uid || !id) return;
      await reportTiming(uid, id, data);
    },
    boardPhoto: () => Alert.alert(t('common.comingSoon')),
  };
}
