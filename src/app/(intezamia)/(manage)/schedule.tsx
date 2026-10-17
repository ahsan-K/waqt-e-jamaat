import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { push } from 'firebase/database';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Segmented } from '@/components/Pill';
import { Touchable } from '@/components/Pressable';
import { useAuth } from '@/features/auth/AuthProvider';
import { DailyEditSheet } from '@/features/intezamia/DailyEditSheet';
import { SpecialSheet } from '@/features/intezamia/SpecialSheet';
import { useManagedMasjid } from '@/features/intezamia/useManagedMasjid';
import { useNow } from '@/hooks/useNow';
import { formatShortDate, formatTime, specialName } from '@/i18n/format';
import type { Language } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';
import { localizeDigits } from '@/lib/digits';
import { resolveActiveSchedule, upcomingChanges } from '@/lib/schedule';
import { applyDailyChange, DEFAULT_DAILY_TIMES, expiredSpecialIds } from '@/lib/scheduleEdit';
import { dateKey, startOfDay } from '@/lib/time';
import { dbRef } from '@/services/firebase/db';
import { deleteSpecials, saveDaily, saveSpecial } from '@/services/firebase/intezamia';
import { ensurePermission } from '@/services/notifications';
import { colors, radii, TOUCH } from '@/theme/tokens';
import {
  DEFAULT_TIMEZONE,
  PRAYERS,
  type PrayerKey,
  type SpecialPrayer,
  type SpecialTimeLabel,
  type SpecialType,
} from '@/types/masjid';

type Tab = 'daily' | 'special';

function timesText(s: SpecialPrayer, t: TFunction, lang: Language) {
  return Object.entries(s.times)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${t(`sch.label_${k as SpecialTimeLabel}`)} ${formatTime(v!, lang)}`)
    .join(' · ');
}

export default function Schedule() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  // Both tabs stay mounted, so set the status bar when this tab gains focus.
  useFocusEffect(useCallback(() => setStatusBarStyle('dark'), []));
  const now = useNow();
  const params = useLocalSearchParams<{ tab?: Tab; edit?: string }>();
  const { user } = useAuth();
  const { id, masjid, stats, loading } = useManagedMasjid();
  const [tab, setTab] = useState<Tab>(params.tab === 'special' ? 'special' : 'daily');
  const [editing, setEditing] = useState<PrayerKey | null>(null);
  const [specialSheet, setSpecialSheet] = useState<{
    id: string | null;
    type: SpecialType;
    special?: SpecialPrayer;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const tz = masjid?.timezone || DEFAULT_TIMEZONE;
  const today = dateKey(now, tz);
  const schedule = useMemo(
    () => (masjid ? resolveActiveSchedule(masjid, now) : null),
    [masjid, now],
  );
  const changes = useMemo(() => (masjid ? upcomingChanges(masjid, now) : []), [masjid, now]);
  const specials = useMemo(
    () => Object.entries(masjid?.specials ?? {}).sort((a, b) => a[1].updatedAt - b[1].updatedAt),
    [masjid],
  );

  // Deep link from the Dashboard "Kal" card: open that special in the editor (derived state).
  const [handledEdit, setHandledEdit] = useState<string | undefined>();
  if (params.edit && params.edit !== handledEdit && masjid?.specials?.[params.edit]) {
    const s = masjid.specials[params.edit]!;
    setHandledEdit(params.edit);
    setTab('special');
    setSpecialSheet({ id: params.edit, type: s.type, special: s });
  }

  useEffect(() => {
    if (!toast) return;
    const id2 = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id2);
  }, [toast]);

  if (loading || !masjid || !id || !user) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const active = schedule?.active;
  const editingTime = editing ? (active?.times[editing] ?? DEFAULT_DAILY_TIMES[editing]) : null;

  const onSaveDaily: Parameters<typeof DailyEditSheet>[0]['onSave'] = async (
    value,
    when,
    notify,
  ) => {
    if (!editing) return;
    const daily = applyDailyChange(masjid, editing, value, when, {
      now: Date.now(),
      uid: user.uid,
      notify,
      newId: () => push(dbRef(`masjids/${id}/daily`)).key!,
    });
    try {
      await saveDaily(id, masjid, daily);
      const prayer = t(`prayer.${editing}`);
      const whenText =
        when.kind === 'now'
          ? ''
          : when.kind === 'tomorrow'
            ? t('sch.whenTomorrow')
            : t('sch.fromDate', { date: formatShortDate(startOfDay(when.date, tz), tz, language) });
      setToast(
        `${when.kind === 'now' ? t('sch.toastNow', { prayer }) : t('sch.toastLater', { prayer, when: whenText })}${
          notify && when.kind !== 'now' ? ' ' + t('sch.toastNotify') : ''
        }`,
      );
      setEditing(null);
    } catch (e) {
      Alert.alert(t('common.error'), __DEV__ ? String((e as Error).message) : undefined);
    }
  };

  const onSaveSpecial = async (s: SpecialPrayer) => {
    try {
      await saveSpecial(id, specialSheet?.id ?? null, s);
      // Housekeeping: drop specials whose last date has passed (PLAN §12 Phase 5).
      await deleteSpecials(id, expiredSpecialIds(masjid.specials, today));
      if (s.remindManagement) await ensurePermission();
      const repeatText =
        s.repeat.kind === 'weekly'
          ? t('sch.every', { day: t(`weekday.${s.repeat.weekday}`) })
          : t(`sch.repeat_${s.repeat.kind}`);
      setToast(t('sch.toastSpecial', { name: specialName(s, language, t), repeat: repeatText }));
      setSpecialSheet(null);
    } catch (e) {
      Alert.alert(t('common.error'), __DEV__ ? String((e as Error).message) : undefined);
    }
  };

  const onDelete = (sid: string, s: SpecialPrayer) =>
    Alert.alert(t('sch.deleteConfirm'), specialName(s, language, t), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sch.delete'),
        style: 'destructive',
        onPress: () => void deleteSpecials(id, [sid]),
      },
    ]);

  const rangeText = (s: SpecialPrayer) => {
    const d = (x: string) => formatShortDate(startOfDay(x, tz), tz, language);
    const r = s.repeat;
    if ((s.type === 'eid_ul_fitr' || s.type === 'eid_ul_adha') && !s.dateConfirmed)
      return t('sch.eidPending');
    if (r.kind === 'once') return d(r.date);
    if (r.kind === 'daily') return t('sch.rangeUntil', { from: d(r.from), until: d(r.until) });
    return r.until ? t('sch.rangeUntil', { from: d(r.from), until: d(r.until) }) : t('sch.forever');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <View style={styles.titleRow}>
          <AppText size={30} weight="extrabold" accessibilityRole="header">
            {t('sch.title')}
          </AppText>
          {tab === 'daily' && (
            <Button
              size="sm"
              variant="accent"
              icon={<Icon name="camera" size={18} color={colors.accentText} />}
              label={t('sch.boardPhoto')}
              onPress={() => Alert.alert(t('common.comingSoon'))}
            />
          )}
        </View>
        <AppText size={14} color="muted">
          {tab === 'daily' ? t('sch.dailySub') : t('sch.specialSub')}
        </AppText>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'daily', label: t('sch.daily'), testID: 'tab-daily' },
            { value: 'special', label: t('sch.special'), testID: 'tab-special' },
          ]}
        />

        {tab === 'daily' &&
          (!active ? (
            <View style={styles.empty} testID="daily-empty">
              <View style={styles.emptyIcon}>
                <Icon name="clock" size={32} color={colors.primary} />
              </View>
              <AppText size={18} weight="extrabold" align="center">
                {t('dash.emptyTitle')}
              </AppText>
              <AppText size={13} color="muted" align="center">
                {t('sch.dailyEmptyBody')}
              </AppText>
              {!!stats.requests && (
                <View style={styles.reqChip}>
                  <AppText size={12} weight="extrabold" color="accentText">
                    {t('sch.requestsCount', { n: localizeDigits(stats.requests, language) })}
                  </AppText>
                </View>
              )}
              <Button
                testID="fill-daily"
                label={t('dash.addTimings')}
                onPress={() => setEditing('fajr')}
                style={styles.stretch}
              />
              <Button
                variant="accent"
                label={t('reg.fromPhoto')}
                onPress={() => Alert.alert(t('common.comingSoon'))}
                style={styles.stretch}
              />
            </View>
          ) : (
            <>
              <View style={styles.card}>
                {PRAYERS.map((p, i) => {
                  const pt = active.times[p];
                  const ch = changes.find((c) => c.prayer === p);
                  return (
                    <Touchable
                      key={p}
                      testID={`edit-${p}`}
                      onPress={() => setEditing(p)}
                      accessibilityLabel={[
                        t('sch.editPrayer', { prayer: t(`prayer.${p}`) }),
                        `${t('sch.jamaat')} ${formatTime(pt.jamaat, language)}`,
                        ch
                          ? t('sch.upChip', {
                              date: formatShortDate(ch.effectiveFrom, tz, language),
                              time: formatTime(ch.jamaat, language),
                            })
                          : '',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      style={[styles.prayerRow, i < PRAYERS.length - 1 && styles.divider]}
                    >
                      <View style={styles.flex}>
                        <AppText size={16} weight="extrabold">
                          {t(`prayer.${p}`)}
                        </AppText>
                        <AppText size={12} color="muted">
                          {t('sch.azaan', { time: formatTime(pt.azaan, language) })}
                        </AppText>
                        {ch && (
                          <View style={styles.upChip}>
                            <AppText size={11} weight="extrabold" color="accentText">
                              {t('sch.upChip', {
                                date: formatShortDate(ch.effectiveFrom, tz, language),
                                time: formatTime(ch.jamaat, language),
                              })}
                            </AppText>
                          </View>
                        )}
                      </View>
                      <View style={styles.end}>
                        <AppText size={11} weight="bold" color="muted">
                          {t('sch.jamaat')}
                        </AppText>
                        <AppText size={20} weight="extrabold" color="primary">
                          {formatTime(pt.jamaat, language)}
                        </AppText>
                      </View>
                      <Icon name="chevron" color={colors.muted} />
                    </Touchable>
                  );
                })}
              </View>
              <AppText size={12} color="muted">
                {t('sch.dailyHint')}
              </AppText>
            </>
          ))}

        {tab === 'special' && (
          <>
            {specials.length === 0 ? (
              <View style={styles.empty} testID="special-empty">
                <View style={styles.emptyIcon}>
                  <Icon name="calendar" size={32} color={colors.primary} />
                </View>
                <AppText size={18} weight="extrabold" align="center">
                  {t('sch.specialEmptyTitle')}
                </AppText>
                <AppText size={13} color="muted" align="center">
                  {t('sch.specialEmptyBody')}
                </AppText>
                <AppText size={12} weight="bold" color="muted">
                  {t('sch.quickStart')}
                </AppText>
                <View style={styles.quickRow}>
                  {(['jumma', 'taraweeh', 'eid_ul_fitr'] as const).map((k) => (
                    <Button
                      key={k}
                      testID={`quick-${k}`}
                      size="sm"
                      variant="secondary"
                      label={`+ ${k === 'eid_ul_fitr' ? 'Eid' : t(`sch.type_${k}`)}`}
                      onPress={() => setSpecialSheet({ id: null, type: k })}
                    />
                  ))}
                </View>
              </View>
            ) : (
              specials.map(([sid, s]) => {
                const warn =
                  (s.type === 'eid_ul_fitr' || s.type === 'eid_ul_adha') && !s.dateConfirmed;
                return (
                  <View key={sid} style={styles.specialCard} testID={`special-${sid}`}>
                    <View style={styles.specialHead}>
                      <AppText size={17} weight="extrabold" style={styles.flex}>
                        {specialName(s, language, t)}
                      </AppText>
                      <Touchable
                        onPress={() => setSpecialSheet({ id: sid, type: s.type, special: s })}
                        accessibilityLabel={t('sch.editSpecial', {
                          name: specialName(s, language, t),
                        })}
                        style={styles.iconBtn}
                      >
                        <Icon name="edit" size={18} color={colors.primary} />
                      </Touchable>
                      <Touchable
                        onPress={() => onDelete(sid, s)}
                        accessibilityLabel={t('sch.deleteSpecial', {
                          name: specialName(s, language, t),
                        })}
                        style={styles.iconBtn}
                      >
                        <Icon name="trash" size={18} color={colors.danger} />
                      </Touchable>
                    </View>
                    <AppText size={14} weight="semibold" color="#3E4A45">
                      {timesText(s, t, language)}
                    </AppText>
                    <View style={styles.chips}>
                      <View style={styles.chip}>
                        <Icon name="refresh" size={14} color="#3E4A45" />
                        <AppText size={12} weight="bold" color="#3E4A45">
                          {s.repeat.kind === 'weekly'
                            ? t('sch.every', { day: t(`weekday.${s.repeat.weekday}`) })
                            : t(`sch.repeat_${s.repeat.kind}`)}
                        </AppText>
                      </View>
                      <View style={[styles.chip, warn && styles.chipWarn]}>
                        <AppText size={12} weight="bold" color={warn ? '#6E3A0A' : '#3E4A45'}>
                          {rangeText(s)}
                        </AppText>
                      </View>
                      {s.remindManagement && (
                        <View style={[styles.chip, styles.chipRemind]}>
                          <Icon name="bell" size={14} color={colors.primary} />
                          <AppText size={12} weight="bold" color="primary">
                            {t('sch.remindChip')}
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
            <Button
              testID="add-special"
              icon={<Icon name="plus" color={colors.white} />}
              label={t('sch.addSpecial')}
              onPress={() => setSpecialSheet({ id: null, type: 'jumma' })}
            />
          </>
        )}
      </ScrollView>

      {toast && (
        <View
          style={[styles.toast, { bottom: insets.bottom + 96 }]}
          accessibilityLiveRegion="polite"
          testID="toast"
        >
          <AppText size={13} weight="bold" color="white">
            {toast}
          </AppText>
        </View>
      )}

      <DailyEditSheet
        prayer={editing}
        current={editingTime}
        today={today}
        timezone={tz}
        onClose={() => setEditing(null)}
        onSave={onSaveDaily}
      />
      <SpecialSheet
        open={!!specialSheet}
        initial={specialSheet ? { type: specialSheet.type, special: specialSheet.special } : null}
        today={today}
        timezone={tz}
        onClose={() => setSpecialSheet(null)}
        onSave={onSaveSpecial}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, gap: 14 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flex: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingHorizontal: 16,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    minHeight: 64,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  end: { alignItems: 'flex-end' },
  upChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colors.accentBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqChip: {
    backgroundColor: colors.accentBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickRow: { flexDirection: 'row', gap: 8 },
  specialCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    gap: 8,
  },
  specialHead: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0EEE7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipWarn: { backgroundColor: colors.accentBg },
  chipRemind: { backgroundColor: colors.primarySoft },
  toast: {
    position: 'absolute',
    start: 20,
    end: 20,
    backgroundColor: colors.ink,
    borderRadius: 18,
    padding: 14,
  },
});
