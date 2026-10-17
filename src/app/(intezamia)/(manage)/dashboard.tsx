import { router, useFocusEffect } from 'expo-router';
import type { TFunction } from 'i18next';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Touchable } from '@/components/Pressable';
import { useManagedMasjid } from '@/features/intezamia/useManagedMasjid';
import { useUnreadCount } from '@/features/notifications/useUnreadCount';
import { useNow } from '@/hooks/useNow';
import { formatShortDate, formatTime, masjidName, rowLabel, specialName } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { localizeDigits } from '@/lib/digits';
import { dayRows, getNextJamaat, hasDailyTimings, resolveActiveSchedule } from '@/lib/schedule';
import { tomorrowToConfirm } from '@/lib/scheduleEdit';
import { dateKey } from '@/lib/time';
import { signOut } from '@/services/firebase/auth';
import { confirmSpecialFor } from '@/services/firebase/intezamia';
import { colors, radii, TOUCH } from '@/theme/tokens';
import {
  DEFAULT_TIMEZONE,
  PRAYERS,
  type SpecialPrayer,
  type SpecialTimeLabel,
} from '@/types/masjid';

function specialTimesText(s: SpecialPrayer, t: TFunction, lang: Parameters<typeof formatTime>[1]) {
  return Object.entries(s.times)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${t(`sch.label_${k as SpecialTimeLabel}`)} ${formatTime(v!, lang)}`)
    .join(' · ');
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  // Both tabs stay mounted, so set the status bar when this tab gains focus.
  useFocusEffect(useCallback(() => setStatusBarStyle('light'), []));
  const now = useNow();
  const unread = useUnreadCount();
  const { id, masjid, stats, loading } = useManagedMasjid();
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const tz = masjid?.timezone || DEFAULT_TIMEZONE;
  const today = dateKey(now, tz);
  const rows = useMemo(() => (masjid ? dayRows(masjid, today, now) : []), [masjid, today, now]);
  const next = useMemo(() => (masjid ? getNextJamaat(masjid, now) : null), [masjid, now]);
  const kal = useMemo(() => (masjid ? tomorrowToConfirm(masjid, now) : []), [masjid, now]);
  const upcoming = useMemo(
    () => (masjid ? resolveActiveSchedule(masjid, now) : null),
    [masjid, now],
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!id || !masjid) {
    return (
      <View style={[styles.root, styles.center, { padding: 24 }]}>
        <AppText size={16} weight="bold" align="center">
          {t('dash.noMasjid')}
        </AppText>
        <Button
          label={t('profile.logout')}
          variant="danger"
          onPress={async () => {
            await signOut();
            router.replace('/welcome');
          }}
        />
      </View>
    );
  }

  const status = masjid.status;
  const jumma = Object.values(masjid.specials ?? {}).find((s) => s.type === 'jumma');
  const active = upcoming?.active;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerTop}>
            <AppText size={13} weight="bold" color="onPrimaryMuted" style={styles.caps}>
              {t('dash.kicker')}
            </AppText>
            <View style={styles.headerBtns}>
              <Touchable
                testID="dash-bell"
                onPress={() => router.push('/notifications')}
                accessibilityLabel={
                  unread ? t('map.notifications', { count: unread }) : t('map.notificationsNone')
                }
                style={styles.headerBtn}
              >
                <Icon name="bell" color={colors.white} />
                {unread > 0 && (
                  <View style={styles.badge}>
                    <AppText size={11} weight="extrabold" color="white" script="latin">
                      {unread > 9 ? '9+' : unread}
                    </AppText>
                  </View>
                )}
              </Touchable>
              <Touchable
                testID="dash-logout"
                onPress={async () => {
                  await signOut();
                  router.replace('/welcome');
                }}
                accessibilityLabel={t('profile.logout')}
                style={styles.headerBtn}
              >
                <Icon name="logout" color={colors.white} />
              </Touchable>
            </View>
          </View>
          <AppText size={26} weight="extrabold" color="white" accessibilityRole="header">
            {masjidName(masjid, language)}
          </AppText>
          <View
            testID={`status-${status}`}
            style={[
              styles.status,
              {
                backgroundColor: status === 'approved' ? 'rgba(255,255,255,0.16)' : colors.accentBg,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status === 'approved'
                      ? '#7FE0B5'
                      : status === 'pending'
                        ? colors.accent
                        : colors.danger,
                },
              ]}
            />
            <AppText
              size={12}
              weight="extrabold"
              color={status === 'approved' ? 'white' : '#6E3A0A'}
            >
              {t(`dash.${status}`)}
            </AppText>
          </View>
        </View>

        <View style={styles.body}>
          {kal.map(({ id: sid, special, date }) => (
            <View key={sid} style={styles.kalCard} testID="kal-card">
              <View style={styles.kalTop}>
                <View style={styles.kalIcon}>
                  <Icon name="calendar" color={colors.accentText} />
                </View>
                <View style={styles.flex}>
                  <AppText size={16} weight="extrabold">
                    {t('dash.tomorrow', { name: specialName(special, language, t) })}
                  </AppText>
                  <AppText size={13} weight="semibold" color="#6E3A0A">
                    {specialTimesText(special, t, language)}
                  </AppText>
                </View>
              </View>
              <AppText size={13} color="#5B4A3A">
                {special.dateConfirmed ? t('dash.tomorrowBody') : t('dash.eidConfirmDate')}
              </AppText>
              <View style={styles.row}>
                <Button
                  testID="kal-yes"
                  size="sm"
                  label={t('dash.yesCorrect')}
                  style={styles.flex}
                  onPress={async () => {
                    await confirmSpecialFor(id, sid, date);
                    setConfirmed(specialName(special, language, t));
                  }}
                />
                <Button
                  size="sm"
                  variant="outlinePrimary"
                  label={t('dash.change')}
                  style={styles.flex}
                  onPress={() =>
                    router.navigate({
                      pathname: '/schedule',
                      params: { tab: 'special', edit: sid },
                    })
                  }
                />
              </View>
            </View>
          ))}
          {confirmed && (
            <View style={styles.okMsg} accessibilityLiveRegion="polite">
              <AppText size={13} weight="bold" color="primary">
                {t('dash.confirmedMsg', { name: confirmed })}
              </AppText>
            </View>
          )}

          {status === 'pending' && (
            <View style={styles.pending} testID="pending-banner">
              <AppText size={13} weight="semibold" color="#6E3A0A">
                {t('dash.pendingBanner')}
              </AppText>
            </View>
          )}

          {!hasDailyTimings(masjid) ? (
            <View style={styles.card}>
              <AppText size={16} weight="extrabold">
                {t('dash.emptyTitle')}
              </AppText>
              <AppText size={13} color="muted">
                {t('sch.dailyEmptyBody')}
              </AppText>
              <Button
                testID="dash-add-timings"
                label={t('dash.addTimings')}
                onPress={() => router.navigate('/schedule')}
              />
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <AppText size={16} weight="extrabold">
                  {t('dash.today')}
                </AppText>
                <Touchable
                  onPress={() => router.navigate('/schedule')}
                  accessibilityLabel={t('dash.editTimings')}
                  style={styles.editBtn}
                >
                  <Icon name="edit" size={18} color={colors.primary} />
                </Touchable>
              </View>
              <View style={styles.todayGrid}>
                {rows
                  .filter((r) => r.kind === 'prayer' || r.special.replacesPrayer)
                  .map((r) => {
                    const isNext = next?.date === today && next.row.key === r.key;
                    return (
                      <View key={r.key} style={[styles.todayCell, isNext && styles.todayCellNext]}>
                        <AppText
                          size={11}
                          weight="bold"
                          color={isNext ? 'onPrimaryMuted' : 'muted'}
                          numberOfLines={1}
                        >
                          {rowLabel(r, language, t)}
                        </AppText>
                        <AppText size={16} weight="extrabold" color={isNext ? 'white' : 'ink'}>
                          {formatTime(r.jamaat, language)}
                        </AppText>
                      </View>
                    );
                  })}
              </View>
              {jumma?.times.jamaat && (
                <AppText size={13} weight="semibold" color="muted">
                  {t('dash.jumma', {
                    khutba: jumma.times.khutba ? formatTime(jumma.times.khutba, language) : '—',
                    jamaat: formatTime(jumma.times.jamaat, language),
                  })}
                </AppText>
              )}
            </View>
          )}

          <View style={styles.card}>
            <AppText size={16} weight="extrabold">
              {t('dash.upcoming')}
            </AppText>
            {upcoming && upcoming.upcoming.length > 0 ? (
              <>
                {upcoming.upcoming.map((e) => {
                  const changes = PRAYERS.filter(
                    (p) => active && e.times[p].jamaat !== active.times[p].jamaat,
                  );
                  if (!changes.length) return null;
                  return (
                    <View key={e.id} style={styles.upRow}>
                      <View style={styles.upDate}>
                        <AppText size={13} weight="extrabold" color="accentText" align="center">
                          {formatShortDate(e.effectiveFrom, tz, language)}
                        </AppText>
                      </View>
                      <AppText size={13} weight="semibold" style={styles.flex}>
                        {changes
                          .map(
                            (p) =>
                              `${t(`prayer.${p}`)} ${formatTime(active!.times[p].jamaat, language)} → ${formatTime(e.times[p].jamaat, language)}`,
                          )
                          .join(', ')}
                      </AppText>
                    </View>
                  );
                })}
                <AppText size={12} color="muted">
                  {t('dash.upcomingNote')}
                </AppText>
              </>
            ) : (
              <AppText size={13} color="muted">
                {t('dash.noUpcoming')}
              </AppText>
            )}
          </View>

          <View style={styles.statsRow}>
            {(
              [
                ['favourites', stats.favourites],
                ['confirmations', stats.confirmations],
                ['requests', stats.requests],
              ] as const
            ).map(([k, v]) => (
              <View key={k} style={styles.statCard}>
                <AppText size={22} weight="extrabold" color="primary">
                  {localizeDigits(v ?? 0, language)}
                </AppText>
                <AppText size={11} weight="bold" color="muted" numberOfLines={1}>
                  {t(`dash.${k}`)}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  caps: { textTransform: 'uppercase', letterSpacing: 0.7 },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 22, gap: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    end: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  body: { padding: 20, gap: 14 },
  kalCard: { backgroundColor: colors.accentBg, borderRadius: radii.card, padding: 16, gap: 10 },
  kalTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  kalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  okMsg: { backgroundColor: colors.primarySoft, borderRadius: 16, padding: 12 },
  pending: { backgroundColor: colors.accentBg, borderRadius: 16, padding: 14 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editBtn: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: -10,
  },
  todayGrid: { flexDirection: 'row', gap: 6 },
  todayCell: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  todayCellNext: { backgroundColor: colors.primary },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upDate: {
    minWidth: 56,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: colors.accentBg,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
});
