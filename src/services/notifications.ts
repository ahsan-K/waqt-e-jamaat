import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { colors } from '@/theme/tokens';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;
async function ensureChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync('jamaat', {
    name: 'Jamaat',
    // eslint-disable-next-line import/namespace -- enum re-export the plugin can't resolve
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: colors.primary,
  });
  channelReady = true;
}

export async function hasPermission(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  // eslint-disable-next-line import/namespace -- enum re-export the plugin can't resolve
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Ask only when the user first turns on a reminder (PLAN §11), never at launch. */
export async function ensurePermission(): Promise<boolean> {
  if (await hasPermission()) return true;
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

export type LocalNotification = {
  id: string;
  at: number;
  title: string;
  body: string;
  route?: string;
};

/** Cancel every scheduled notification whose identifier starts with `prefix`, then schedule `items`. */
export async function replaceScheduled(prefix: string, items: LocalNotification[]) {
  if (!(await hasPermission())) return;
  await ensureChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const now = Date.now();
  for (const item of items) {
    if (item.at <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: { title: item.title, body: item.body, data: { route: item.route } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(item.at),
        channelId: 'jamaat',
      },
    });
  }
}

/** Show something right away (timing-change alert). */
export async function notifyNow(item: Omit<LocalNotification, 'at'>) {
  if (!(await hasPermission())) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: item.id,
    content: { title: item.title, body: item.body, data: { route: item.route } },
    trigger: null,
  });
}

/** Tapping a notification deep-links to its route. */
export function listenForTaps() {
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    const route = res.notification.request.content.data?.route;
    if (typeof route === 'string' && route) router.push(route as never);
  });
  return () => sub.remove();
}
