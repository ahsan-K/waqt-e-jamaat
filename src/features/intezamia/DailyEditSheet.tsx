import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { PickerField } from '@/components/PickerField';
import { Pill } from '@/components/Pill';
import { Touchable } from '@/components/Pressable';
import { Switch } from '@/components/Switch';
import { formatShortDate, formatTime } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import type { ApplyWhen } from '@/lib/scheduleEdit';
import { addDays, addMinutes, startOfDay } from '@/lib/time';
import { colors, radii, TOUCH } from '@/theme/tokens';
import type { PrayerKey, PrayerTime } from '@/types/masjid';

type Props = {
  prayer: PrayerKey | null;
  current: PrayerTime | null;
  today: string;
  timezone: string;
  onClose: () => void;
  onSave: (value: PrayerTime, when: ApplyWhen, notify: boolean) => Promise<void>;
};

type WhenKind = ApplyWhen['kind'];

/** Rozana edit sheet (ScheduleDailyEdit mockup): ±5 steppers, Foran / Kal se / Tareekh se, notify. */
export function DailyEditSheet({ prayer, current, today, timezone, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  if (!prayer || !current) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
        <Body
          key={prayer}
          prayer={prayer}
          current={current}
          today={today}
          timezone={timezone}
          onClose={onClose}
          onSave={onSave}
        />
      </View>
    </Modal>
  );
}

function Body({
  prayer,
  current,
  today,
  timezone,
  onClose,
  onSave,
}: Props & { prayer: PrayerKey; current: PrayerTime }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [azaan, setAzaan] = useState(current.azaan);
  const [jamaat, setJamaat] = useState(current.jamaat);
  const [when, setWhen] = useState<WhenKind>('now');
  const [date, setDate] = useState(addDays(today, 7));
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const unchanged = azaan === current.azaan && jamaat === current.jamaat;
  const prayerName = t(`prayer.${prayer}`);

  const stepper = (
    label: string,
    value: string,
    set: (v: string) => void,
    was: string,
    key: string,
  ) => {
    const changed = value !== was;
    return (
      <View style={[styles.stepper, changed && styles.stepperChanged]} key={key}>
        <View style={styles.stepperHead}>
          <AppText size={14} weight="extrabold">
            {label}
          </AppText>
          <AppText size={12} weight="semibold" color={changed ? 'accentText' : 'muted'}>
            {changed
              ? t('sch.was', { time: formatTime(was, language) })
              : t('sch.now', { time: formatTime(was, language) })}
          </AppText>
        </View>
        <View style={styles.stepperRow}>
          <Touchable
            testID={`${key}-minus`}
            onPress={() => set(addMinutes(value, -5))}
            accessibilityLabel={t('sch.minus5', { label })}
            style={styles.stepBtn}
          >
            <Icon name="minus" />
          </Touchable>
          <PickerField
            testID={`${key}-value`}
            mode="time"
            value={value}
            display={formatTime(value, language, t, true)}
            onChange={set}
            style={styles.flex}
          />
          <Touchable
            testID={`${key}-plus`}
            onPress={() => set(addMinutes(value, 5))}
            accessibilityLabel={t('sch.plus5', { label })}
            style={styles.stepBtn}
          >
            <Icon name="plus" />
          </Touchable>
        </View>
      </View>
    );
  };

  const save = async () => {
    setBusy(true);
    try {
      const w: ApplyWhen =
        when === 'date'
          ? { kind: 'date', date }
          : when === 'tomorrow'
            ? { kind: 'tomorrow' }
            : { kind: 'now' };
      await onSave({ azaan, jamaat }, w, notify);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Glass style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={styles.sheetHead}>
          <AppText size={20} weight="extrabold" accessibilityRole="header">
            {t('sch.editTitle', { prayer: prayerName })}
          </AppText>
          <Touchable onPress={onClose} accessibilityLabel={t('common.close')} style={styles.close}>
            <Icon name="close" />
          </Touchable>
        </View>
        {stepper(t('sch.azaan', { time: '' }).trim(), azaan, setAzaan, current.azaan, 'azaan')}
        {stepper(t('sch.jamaat'), jamaat, setJamaat, current.jamaat, 'jamaat')}

        <AppText size={14} weight="extrabold">
          {t('sch.when')}
        </AppText>
        <View style={styles.row}>
          {(
            [
              ['now', t('sch.whenNow')],
              ['tomorrow', t('sch.whenTomorrow')],
              ['date', t('sch.whenDate')],
            ] as const
          ).map(([k, label]) => (
            <Pill
              key={k}
              testID={`when-${k}`}
              label={label}
              on={when === k}
              onPress={() => setWhen(k)}
              style={styles.flex}
            />
          ))}
        </View>
        {when === 'date' && (
          <PickerField
            mode="date"
            value={date}
            display={formatShortDate(startOfDay(date, timezone), timezone, language)}
            onChange={(v) => setDate(v <= today ? addDays(today, 1) : v)}
          />
        )}

        <View style={styles.notifyRow}>
          <View style={styles.flex}>
            <AppText size={14} weight="bold">
              {t('sch.notify')}
            </AppText>
            <AppText size={12} color="muted">
              {t('sch.notifySub')}
            </AppText>
          </View>
          <Switch value={notify} onChange={setNotify} accessibilityLabel={t('sch.notify')} />
        </View>

        <Button
          testID="daily-save"
          label={
            unchanged ? t('sch.noChange') : when === 'now' ? t('sch.applyNow') : t('sch.schedule')
          }
          disabled={unchanged}
          loading={busy}
          onPress={save}
        />
      </ScrollView>
    </Glass>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: 'rgba(20,32,28,0.45)',
  },
  wrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 10 },
  sheet: { borderRadius: radii.sheet, maxHeight: '90%', backgroundColor: 'rgba(255,255,255,0.96)' },
  sheetContent: { padding: 20, gap: 14 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: -10,
  },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 6 },
  stepper: {
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  stepperChanged: { backgroundColor: colors.accentBg },
  stepperHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: TOUCH + 4,
    height: TOUCH + 4,
    borderRadius: (TOUCH + 4) / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
