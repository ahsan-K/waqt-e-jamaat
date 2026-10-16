import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { Touchable } from '@/components/Pressable';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNow } from '@/hooks/useNow';
import { useLanguage } from '@/i18n/useLanguage';
import { localizeDigits } from '@/lib/digits';
import { groupOf, unreadCount, type InboxGroup, type InboxItem, type InboxType } from '@/lib/inbox';
import { addDays } from '@/lib/time';
import { useNativeHeader } from '@/navigation/header';
import { useInbox } from '@/store/inbox';
import { colors } from '@/theme/tokens';

type Filter = 'all' | 'change' | 'reminder' | 'report';

const STYLE: Record<InboxType, { icon: IconName; bg: string; fg: string }> = {
  change: { icon: 'clock', bg: colors.accentBg, fg: colors.accentText },
  reminder: { icon: 'bell', bg: colors.primarySoft, fg: colors.primary },
  added: { icon: 'check', bg: colors.primarySoft, fg: colors.primary },
  special: { icon: 'calendar', bg: '#F0EEE7', fg: '#3E4A45' },
  report: { icon: 'alert', bg: '#FDE8E6', fg: colors.danger },
  request: { icon: 'send', bg: '#F0EEE7', fg: '#3E4A45' },
  approved: { icon: 'checkCircle', bg: colors.primarySoft, fg: colors.primary },
  rejected: { icon: 'alert', bg: '#FDE8E6', fg: colors.danger },
};

const FILTER_OF: Record<InboxType, Filter> = {
  change: 'change',
  special: 'change',
  added: 'change',
  reminder: 'reminder',
  report: 'report',
  request: 'report',
  approved: 'all',
  rejected: 'all',
};

function localDate(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Notifications() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const header = useNativeHeader(t('notif.title'));
  const now = useNow(60_000);
  const { user, profile } = useAuth();
  const uid = user?.uid ?? '';
  const isIntezamia = profile?.role === 'intezamia';
  const all = useInbox((s) => s.byUser[uid]);
  const markRead = useInbox((s) => s.markRead);
  const markAllRead = useInbox((s) => s.markAllRead);
  const [filter, setFilter] = useState<Filter>('all');

  // Future reminders are scheduled but not "arrived" yet.
  const items = useMemo(() => (all ?? []).filter((i) => i.at <= now), [all, now]);
  const visible = items.filter((i) => filter === 'all' || FILTER_OF[i.type] === filter);
  const unread = unreadCount(items, now);
  const today = localDate(now);
  const yesterday = addDays(today, -1);
  const groups = useMemo(() => {
    const order: InboxGroup[] = ['today', 'yesterday', 'week', 'older'];
    const map = new Map<InboxGroup, InboxItem[]>();
    for (const i of visible) {
      const g = groupOf(localDate(i.at), today, yesterday);
      map.set(g, [...(map.get(g) ?? []), i]);
    }
    return order.filter((g) => map.has(g)).map((g) => ({ g, items: map.get(g)! }));
  }, [visible, today, yesterday]);

  const ago = (at: number) => {
    const min = Math.max(1, Math.round((now - at) / 60000));
    if (min < 60) return t('notif.minutesAgo', { n: localizeDigits(min, language) });
    const h = Math.round(min / 60);
    if (h < 24) return t('notif.hoursAgo', { n: localizeDigits(h, language) });
    return t('notif.daysAgo', { n: localizeDigits(Math.round(h / 24), language) });
  };

  const filters: { value: Filter; label: string }[] = isIntezamia
    ? [
        { value: 'all', label: t('notif.filterAll') },
        { value: 'reminder', label: t('notif.filterReminders') },
        { value: 'report', label: t('notif.filterReports') },
      ]
    : [
        { value: 'all', label: t('notif.filterAll') },
        { value: 'change', label: t('notif.filterChanges') },
        { value: 'reminder', label: t('notif.filterReminders') },
      ];

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          ...header,
          headerRight: () => (
            <Touchable
              testID="mark-all"
              disabled={unread === 0}
              onPress={() => markAllRead(uid)}
              style={[styles.markAll, unread === 0 && styles.markAllOff]}
            >
              <AppText size={13} weight="extrabold" color={unread ? 'primary' : '#7A847F'}>
                {t('notif.markAll')}
              </AppText>
            </Touchable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <AppText size={13} weight="semibold" color="muted" testID="unread-label">
          {unread
            ? t('notif.unread', { count: unread, n: localizeDigits(unread, language) })
            : t('notif.allRead')}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {filters.map((f) => (
            <Pill
              key={f.value}
              label={f.label}
              on={filter === f.value}
              onPress={() => setFilter(f.value)}
            />
          ))}
        </ScrollView>

        {visible.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="bell" size={30} color={colors.primary} />
            </View>
            <AppText size={18} weight="extrabold" align="center">
              {t('notif.emptyTitle')}
            </AppText>
            <AppText size={13} color="muted" align="center">
              {isIntezamia ? t('notif.emptyIntezamia') : t('notif.emptyNamazi')}
            </AppText>
          </View>
        ) : (
          groups.map(({ g, items: list }) => (
            <View key={g} style={styles.group}>
              <AppText size={12} weight="extrabold" color="muted" style={styles.groupLabel}>
                {t(`notif.${g}`)}
              </AppText>
              <View style={styles.card}>
                {list.map((n, i) => {
                  const st = STYLE[n.type];
                  const isUnread = !n.readAt;
                  return (
                    <Touchable
                      key={n.id}
                      testID={`notif-${n.id}`}
                      style={[styles.item, i < list.length - 1 && styles.divider]}
                      onPress={() => {
                        markRead(uid, n.id);
                        if (n.route) router.push(n.route as never);
                      }}
                      accessibilityLabel={`${n.title}. ${n.body}. ${ago(n.at)}${isUnread ? '. ' + t('notif.unreadDot') : ''}`}
                    >
                      <View style={[styles.itemIcon, { backgroundColor: st.bg }]}>
                        <Icon name={st.icon} size={20} color={st.fg} />
                      </View>
                      <View style={styles.itemText}>
                        <AppText size={14} weight={isUnread ? 'extrabold' : 'semibold'}>
                          {n.title}
                        </AppText>
                        <AppText size={12} color="muted">
                          {n.body}
                        </AppText>
                        <AppText size={11} weight="bold" color="#7A847F">
                          {ago(n.at)}
                        </AppText>
                      </View>
                      {isUnread && <View style={styles.dot} />}
                    </Touchable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  markAll: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
  },
  markAllOff: { backgroundColor: 'transparent' },
  filters: { gap: 8 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 40, paddingHorizontal: 20 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { gap: 6 },
  groupLabel: { paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.7 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, gap: 3, minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: colors.accent },
});
