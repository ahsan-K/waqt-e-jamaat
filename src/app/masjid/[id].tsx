import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { Touchable } from '@/components/Pressable';
import { SignInSheet, type GateReason } from '@/components/SignInSheet';
import { useCalcSettings, useCalculated } from '@/features/masjid/calculated';
import { useMasjidActions } from '@/features/masjid/useMasjidActions';
import { PrayerTable } from '@/features/masjid/PrayerTable';
import { ReportSheet } from '@/features/masjid/ReportSheet';
import { useMasjid, useMasjidStats } from '@/features/masjid/queries';
import { useNow } from '@/hooks/useNow';
import {
  formatKm,
  formatMinutesLeft,
  formatShortDate,
  formatTime,
  masjidName,
  nextShortLabel,
  rowLabel,
} from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { CALC_PRAYERS } from '@/lib/calculated';
import { localizeDigits } from '@/lib/digits';
import { directionsUrls } from '@/lib/directions';
import { distanceKm, walkingMinutes } from '@/lib/geo';
import { dayRows, getNextJamaat, hasDailyTimings, upcomingChanges } from '@/lib/schedule';
import { dateKey } from '@/lib/time';
import { useLastLocation } from '@/store/location';
import { colors, radii, TOUCH } from '@/theme/tokens';
import { useNativeHeader, useNativeHeaderOnPrimary } from '@/navigation/header';
import { DEFAULT_TIMEZONE } from '@/types/masjid';

function HeaderButton({
  icon,
  label,
  onPress,
  filled,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  filled?: boolean;
  testID?: string;
}) {
  return (
    <Touchable
      testID={testID}
      onPress={onPress}
      accessibilityLabel={label}
      style={styles.headerBtn}
    >
      <Icon name={icon} color={filled ? colors.accentBg : colors.white} />
    </Touchable>
  );
}

export default function MasjidDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const masjidQ = useMasjid(id);
  const statsQ = useMasjidStats(id);
  const userLoc = useLastLocation((s) => s.location);
  const m = masjidQ.data;
  const tz = m?.timezone || DEFAULT_TIMEZONE;
  const withTimings = !!m && hasDailyTimings(m);
  const calc = useCalculated(m ? { lat: m.lat, lng: m.lng } : null, now, tz, !!m && !withTimings);
  const calcSettings = useCalcSettings();
  const [gate, setGate] = useState<GateReason | null>(null);
  const actions = useMasjidActions(id, m ?? null, setGate);

  const today = dateKey(now, tz);
  const rows = useMemo(() => (m ? dayRows(m, today, now) : []), [m, today, now]);
  const next = useMemo(() => (m ? getNextJamaat(m, now) : null), [m, now]);
  const changes = useMemo(() => (m ? upcomingChanges(m, now) : []), [m, now]);
  const dist = m && userLoc ? distanceKm(userLoc, m) : null;
  const headerOnPrimary = useNativeHeaderOnPrimary();
  const headerPlain = useNativeHeader();
  const headerHeight = useHeaderHeight();

  if (masjidQ.isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <Stack.Screen options={headerPlain} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!m) {
    return (
      <View style={[styles.root, styles.center, { padding: 24 }]}>
        <Stack.Screen options={headerPlain} />
        <AppText size={16} weight="bold" align="center">
          {masjidQ.isError ? t('common.error') : t('detail.notFound')}
        </AppText>
        <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const name = masjidName(m, language);
  const nextLabel = next ? rowLabel(next.row, language, t) : null;
  const dailyRows = rows.filter((r) => r.kind === 'prayer' || r.special.replacesPrayer);
  const extraSpecials = rows.filter((r) => r.kind === 'special' && !r.special.replacesPrayer);
  const confirmCount = (statsQ.data?.confirmations ?? 0) + (actions.confirmedNow ? 1 : 0);
  const updatedDays =
    m.timingsUpdatedAt !== undefined
      ? Math.max(0, Math.floor((now - m.timingsUpdatedAt) / 86_400_000))
      : null;

  const openDirections = async () => {
    for (const url of directionsUrls(m, name, Platform.OS)) {
      try {
        if (url.startsWith('http') || (await Linking.canOpenURL(url))) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        // try next
      }
    }
  };

  const share = () =>
    void Share.share({
      message: t('detail.shareText', {
        name,
        next: nextShortLabel(next ?? calc.next, language, t) ?? '',
      }),
    });

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          ...headerOnPrimary,
          headerRight: () => (
            <View style={styles.headerActions}>
              <HeaderButton icon="share" label={t('detail.share')} onPress={share} />
              <HeaderButton
                testID="fav-toggle"
                icon="star"
                filled={actions.isFavourite}
                label={actions.isFavourite ? t('detail.favRemove') : t('detail.favAdd')}
                onPress={actions.toggleFavourite}
              />
            </View>
          ),
        }}
      />
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: headerHeight + 4 }]}>
          <View style={styles.titleBlock}>
            <AppText size={26} weight="extrabold" color="white" accessibilityRole="header">
              {name}
            </AppText>
            <AppText size={14} color="onPrimaryMuted">
              {dist !== null
                ? t('detail.addressDistance', {
                    address: m.address,
                    dist: formatKm(dist, language, t),
                  })
                : m.address}
            </AppText>
          </View>

          {withTimings ? (
            <View style={styles.nextCard} testID="next-card">
              <View style={styles.nextLeft}>
                <AppText size={12} weight="bold" color="accentText" style={styles.caps}>
                  {t('detail.nextJamaat')}
                </AppText>
                <AppText size={24} weight="extrabold">
                  {next && nextLabel
                    ? `${nextLabel} · ${formatTime(next.time, language, t, true)}`
                    : t('detail.noJamaatToday')}
                </AppText>
              </View>
              {next && (
                <View style={styles.nextRight}>
                  <AppText size={22} weight="extrabold" color="accentText">
                    {next.minutesLeft < 60
                      ? t('detail.minShort', { min: localizeDigits(next.minutesLeft, language) })
                      : formatMinutesLeft(next.minutesLeft, language, t)}
                  </AppText>
                  {dist !== null && (
                    <AppText size={12} weight="semibold" color="#5B4A3A">
                      {t('detail.walking', {
                        min: localizeDigits(walkingMinutes(dist), language),
                      })}
                    </AppText>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.nextCard, styles.nextCardEstimate]} testID="next-card-estimate">
              <View style={styles.nextLeft}>
                <AppText size={12} weight="bold" color="onPrimaryMuted" style={styles.caps}>
                  {t('detail.nextEstimate')}
                </AppText>
                <AppText size={24} weight="extrabold" color="white">
                  {calc.next
                    ? `${t(`prayer.${calc.next.prayer}`)} · ${formatTime(calc.next.time, language, t, true)}`
                    : '—'}
                </AppText>
              </View>
              <View style={styles.nextRight}>
                <AppText size={13} weight="extrabold" color="white">
                  {t('detail.timeStarts')}
                </AppText>
                <AppText size={12} weight="semibold" color="onPrimaryMuted">
                  {t('detail.jamaatUnconfirmed')}
                </AppText>
              </View>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {withTimings ? (
            <>
              <View style={styles.sectionHead}>
                <AppText size={17} weight="extrabold" accessibilityRole="header">
                  {t('detail.todaySchedule')}
                </AppText>
                <AppText size={12} weight="semibold" color="muted">
                  {t('detail.azaanJamaat')}
                </AppText>
              </View>
              <PrayerTable
                rows={[...dailyRows, ...extraSpecials]}
                nextKey={next?.date === today ? next.row.key : null}
              />

              {!rows.some((r) => r.kind === 'special' && r.special.type === 'jumma') &&
                m.specials &&
                Object.values(m.specials)
                  .filter((s) => s.type === 'jumma')
                  .slice(0, 1)
                  .map((s) => (
                    <View key="jumma" style={styles.jummaRow}>
                      <AppText size={15} weight="extrabold">
                        {t('special.jumma')}
                      </AppText>
                      <AppText size={13} weight="semibold" color="#3E4A45">
                        {s.times.khutba
                          ? t('detail.khutbaJamaat', {
                              khutba: formatTime(s.times.khutba, language),
                            })
                          : ''}{' '}
                        <AppText size={13} weight="extrabold" color="primary">
                          {s.times.jamaat ? formatTime(s.times.jamaat, language) : ''}
                        </AppText>
                      </AppText>
                    </View>
                  ))}

              {changes.map((c) => (
                <View key={c.prayer} style={styles.changeChip}>
                  <Icon name="calendar" size={16} color={colors.accentText} />
                  <AppText size={13} weight="bold" color="accentText">
                    {t(`prayer.${c.prayer}`)} ·{' '}
                    {t('detail.upcomingChange', {
                      date: formatShortDate(c.effectiveFrom, tz, language),
                      time: formatTime(c.jamaat, language),
                    })}
                  </AppText>
                </View>
              ))}

              <View style={styles.confirmRow}>
                <AppText size={12} weight="semibold" color="muted" style={styles.flex}>
                  {updatedDays === null
                    ? ''
                    : updatedDays === 0
                      ? t('detail.updatedToday')
                      : t('detail.updatedDaysAgo', { n: localizeDigits(updatedDays, language) })}
                  {' · '}
                  {t('detail.confirmedBy', { n: localizeDigits(confirmCount, language) })}
                </AppText>
                <Button
                  testID="confirm-btn"
                  size="sm"
                  variant={actions.confirmed ? 'primary' : 'outlinePrimary'}
                  label={actions.confirmed ? t('detail.thanks') : t('detail.timeCorrect')}
                  disabled={actions.confirmed}
                  onPress={actions.confirm}
                  style={styles.confirmBtn}
                />
              </View>
              <Touchable onPress={actions.report} accessibilityRole="link" style={styles.link}>
                <AppText size={13} weight="semibold" color="primary" style={styles.underline}>
                  {t('detail.reportLink')}
                </AppText>
              </Touchable>
            </>
          ) : (
            <>
              <View style={styles.sectionHead}>
                <AppText size={17} weight="extrabold" accessibilityRole="header">
                  {t('detail.todayTimes')}
                </AppText>
                <View style={styles.estimateBadge}>
                  <AppText size={12} weight="extrabold" color="#6E3A0A">
                    {t('detail.estimateBadge')}
                  </AppText>
                </View>
              </View>
              {calc.today ? (
                <View style={styles.estimateCard}>
                  {CALC_PRAYERS.map((p, i) => {
                    const isNext = calc.next?.date === calc.date && calc.next.prayer === p;
                    return (
                      <View
                        key={p}
                        style={[styles.estimateRow, i < CALC_PRAYERS.length - 1 && styles.divider]}
                      >
                        <View style={styles.nameCell}>
                          {isNext && <View style={styles.dot} />}
                          <AppText size={15} weight={isNext ? 'extrabold' : 'semibold'}>
                            {t(`prayer.${p}`)}
                          </AppText>
                        </View>
                        <AppText size={15} weight="bold" color="#3E4A45">
                          {formatTime(calc.today![p], language, t, true)}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              ) : calc.isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
              ) : (
                <View style={[styles.estimateCard, styles.center, { padding: 16, gap: 10 }]}>
                  <AppText size={14} color="muted" align="center">
                    {t('detail.estimateError')}
                  </AppText>
                  <Button
                    size="sm"
                    variant="secondary"
                    label={t('common.retry')}
                    onPress={calc.refetch}
                  />
                </View>
              )}
              <AppText size={11} weight="semibold" color="muted">
                {t('detail.estimateNote', {
                  method: t(`method.${calcSettings.method}`),
                  school: t(`school.${calcSettings.school}`),
                })}
              </AppText>
              <View style={styles.requestCard}>
                <AppText size={14} weight="extrabold">
                  {t('detail.noTimingsCard')}
                </AppText>
                <View style={styles.requestBtns}>
                  <Button
                    testID="request-btn"
                    size="sm"
                    style={styles.flex}
                    variant={actions.requested ? 'secondary' : 'primary'}
                    label={actions.requested ? t('detail.requestSent') : t('detail.sendRequest')}
                    disabled={actions.requested}
                    onPress={() => void actions.request()}
                  />
                  <Button
                    size="sm"
                    style={[styles.flex, styles.photoBtn]}
                    variant="accent"
                    label={t('detail.boardPhoto')}
                    onPress={actions.boardPhoto}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Glass style={[styles.bottomBar, { bottom: insets.bottom + 10 }]}>
        <Button
          style={styles.flex}
          label={t('detail.directions')}
          icon={<Icon name="directions" color={colors.white} />}
          onPress={openDirections}
        />
        {withTimings ? (
          <Button
            testID="remind-btn"
            style={styles.flex}
            variant={actions.reminderOn ? 'secondary' : 'outlinePrimary'}
            label={actions.reminderOn ? t('detail.remindOn') : t('detail.remind')}
            onPress={actions.toggleReminder}
          />
        ) : (
          <Button
            testID="notify-btn"
            style={styles.flex}
            variant={actions.notifyWhenAdded ? 'secondary' : 'outlinePrimary'}
            label={actions.notifyWhenAdded ? t('detail.willNotify') : t('detail.notifyWhenAdded')}
            onPress={() => void actions.toggleNotifyWhenAdded()}
          />
        )}
      </Glass>

      <SignInSheet reason={gate} onClose={() => setGate(null)} />
      <ReportSheet
        visible={actions.reportOpen}
        onClose={actions.closeReport}
        onSubmit={actions.submitReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  flex: { flex: 1 },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { gap: 4 },
  nextCard: {
    backgroundColor: colors.accentBg,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  nextCardEstimate: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  nextLeft: { gap: 2, flexShrink: 1 },
  nextRight: { alignItems: 'flex-end', gap: 2 },
  caps: { textTransform: 'uppercase', letterSpacing: 0.7 },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jummaRow: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentBg,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmBtn: { borderRadius: 12, borderColor: colors.primary, borderWidth: 1.5 },
  link: { alignSelf: 'flex-start', minHeight: TOUCH, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  estimateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.accentBg,
  },
  estimateCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DAD6CB',
    borderRadius: 18,
    paddingVertical: 2,
    paddingHorizontal: 16,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  requestCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  requestBtns: { flexDirection: 'row', gap: 8 },
  photoBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent },
  bottomBar: {
    position: 'absolute',
    start: 12,
    end: 12,
    padding: 8,
    borderRadius: radii.sheet,
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
});
