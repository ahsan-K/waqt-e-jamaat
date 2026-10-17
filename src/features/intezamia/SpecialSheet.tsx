import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { PickerField } from '@/components/PickerField';
import { Pill } from '@/components/Pill';
import { Touchable } from '@/components/Pressable';
import { Switch } from '@/components/Switch';
import { formatShortDate, formatTime } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { specialDefaults, specialFields } from '@/lib/scheduleEdit';
import { addDays, isHHmm, startOfDay } from '@/lib/time';
import { colors, radii, TOUCH } from '@/theme/tokens';
import type {
  SpecialPrayer,
  SpecialRepeat,
  SpecialTimeLabel,
  SpecialType,
  Weekday,
} from '@/types/masjid';

const TYPES: SpecialType[] = ['jumma', 'taraweeh', 'eid_ul_fitr', 'eid_ul_adha', 'custom'];
const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

type Props = {
  open: boolean;
  initial: { type: SpecialType; special?: SpecialPrayer } | null;
  today: string;
  timezone: string;
  onClose: () => void;
  onSave: (s: SpecialPrayer) => Promise<void>;
};

/** Special namaz add / edit sheet (ScheduleSpecialAdd mockup). */
export function SpecialSheet(props: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  if (!props.open || !props.initial) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={props.onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={props.onClose}
        accessibilityLabel={t('common.close')}
      />
      <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
        <Body {...props} initial={props.initial} />
      </View>
    </Modal>
  );
}

function Body({
  initial,
  today,
  timezone,
  onClose,
  onSave,
}: Props & { initial: NonNullable<Props['initial']> }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const editing = !!initial.special;
  const start = initial.special ?? {
    ...specialDefaults(initial.type, today),
    type: initial.type,
    updatedAt: 0,
  };

  const [type, setType] = useState<SpecialType>(start.type);
  const [times, setTimes] = useState<Partial<Record<SpecialTimeLabel, string>>>(start.times);
  const [repeat, setRepeat] = useState<SpecialRepeat>(start.repeat);
  const [remind, setRemind] = useState(start.remindManagement);
  const [dateConfirmed, setDateConfirmed] = useState(start.dateConfirmed);
  const [nameEn, setNameEn] = useState(start.customName?.en ?? '');
  const [nameUr, setNameUr] = useState(start.customName?.ur ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const isEid = type === 'eid_ul_fitr' || type === 'eid_ul_adha';
  const fields = specialFields(type);
  const fromDate = repeat.kind === 'once' ? repeat.date : repeat.from;
  const until = repeat.kind === 'once' ? undefined : repeat.until;

  const pickType = (k: SpecialType) => {
    const d = specialDefaults(k, today);
    setType(k);
    setTimes(d.times);
    setRepeat(d.repeat);
    setRemind(d.remindManagement);
    setDateConfirmed(d.dateConfirmed);
    setErrors({});
  };

  const setKind = (kind: SpecialRepeat['kind']) => {
    setRemind(kind !== 'weekly');
    if (kind === 'once') setRepeat({ kind, date: fromDate });
    else if (kind === 'daily')
      setRepeat({ kind, from: fromDate, until: until ?? addDays(fromDate, 29) });
    else setRepeat({ kind, weekday: 5, from: fromDate, until });
  };

  const setFrom = (v: string) => {
    if (repeat.kind === 'once') setRepeat({ ...repeat, date: v });
    else setRepeat({ ...repeat, from: v } as SpecialRepeat);
  };
  const setUntil = (v: string | undefined) => {
    if (repeat.kind === 'daily') setRepeat({ ...repeat, until: v ?? repeat.until });
    if (repeat.kind === 'weekly') setRepeat({ ...repeat, until: v });
  };

  const dateLabel = (d: string) => formatShortDate(startOfDay(d, timezone), timezone, language);

  const save = async () => {
    const e: Record<string, string> = {};
    for (const f of fields) if (!times[f] || !isHHmm(times[f])) e[f] = t('sch.err.time');
    if (type === 'custom' && !nameEn.trim()) e.name = t('sch.err.name');
    if (repeat.kind === 'daily' && !repeat.until) e.until = t('sch.err.until');
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = Object.fromEntries(fields.map((f) => [f, times[f]])) as SpecialPrayer['times'];
    const special: SpecialPrayer = {
      type,
      times: clean,
      repeat,
      dateConfirmed: isEid ? dateConfirmed : true,
      remindManagement: remind,
      updatedAt: 0, // set by saveSpecial
      ...(type === 'jumma' ? { replacesPrayer: 'zuhr' as const } : {}),
      ...(type === 'custom'
        ? { customName: { en: nameEn.trim(), ur: nameUr.trim() || nameEn.trim() } }
        : {}),
      ...(initial.special?.lastConfirmedFor
        ? { lastConfirmedFor: initial.special.lastConfirmedFor }
        : {}),
    };
    setBusy(true);
    try {
      await onSave(special);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Glass style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <AppText size={20} weight="extrabold" accessibilityRole="header">
            {t('sch.sheetTitle')}
          </AppText>
          <Touchable onPress={onClose} accessibilityLabel={t('common.close')} style={styles.close}>
            <Icon name="close" />
          </Touchable>
        </View>

        {!editing && (
          <>
            <AppText size={14} weight="extrabold">
              {t('sch.whichPrayer')}
            </AppText>
            <View style={styles.wrapRow}>
              {TYPES.map((k) => (
                <Pill
                  key={k}
                  testID={`type-${k}`}
                  label={t(`sch.type_${k}`)}
                  on={type === k}
                  onPress={() => pickType(k)}
                />
              ))}
            </View>
          </>
        )}

        {type === 'custom' && (
          <>
            <Input
              testID="special-name"
              placeholder={t('sch.customNamePh')}
              value={nameEn}
              onChangeText={setNameEn}
              error={errors.name}
            />
            <Input placeholder={t('sch.customNameUrPh')} value={nameUr} onChangeText={setNameUr} />
          </>
        )}

        <View style={styles.row}>
          {fields.map((f) => (
            <PickerField
              key={f}
              testID={`special-${f}`}
              mode="time"
              label={t(`sch.label_${f}`)}
              value={times[f] ?? ''}
              display={times[f] ? formatTime(times[f]!, language, t, true) : ''}
              onChange={(v) => setTimes((x) => ({ ...x, [f]: v }))}
              error={errors[f]}
              style={styles.flex}
            />
          ))}
        </View>

        <AppText size={14} weight="extrabold">
          {t('sch.repeat')}
        </AppText>
        <View style={styles.row}>
          {(['once', 'daily', 'weekly'] as const).map((k) => (
            <Pill
              key={k}
              testID={`repeat-${k}`}
              label={t(`sch.repeat_${k}`)}
              on={repeat.kind === k}
              onPress={() => setKind(k)}
              style={styles.flex}
            />
          ))}
        </View>
        {repeat.kind === 'weekly' && (
          <View style={styles.wrapRow}>
            {WEEK_ORDER.map((d) => (
              <Pill
                key={d}
                label={t(`weekday.${d}`)}
                on={repeat.weekday === d}
                onPress={() => setRepeat({ ...repeat, weekday: d })}
              />
            ))}
          </View>
        )}

        <View style={styles.row}>
          <PickerField
            mode="date"
            label={repeat.kind === 'once' ? t('sch.date') : t('sch.from')}
            value={fromDate}
            display={dateLabel(fromDate)}
            onChange={setFrom}
            style={styles.flex}
          />
          {repeat.kind !== 'once' && (
            <PickerField
              mode="date"
              label={repeat.kind === 'daily' ? t('sch.until') : t('sch.untilOptional')}
              value={until ?? ''}
              display={until ? dateLabel(until) : ''}
              placeholder={repeat.kind === 'weekly' ? t('sch.forever') : undefined}
              onChange={setUntil}
              error={errors.until}
              style={styles.flex}
            />
          )}
        </View>

        {isEid && (
          <>
            <View style={styles.note}>
              <AppText size={12} weight="semibold" color="#6E3A0A">
                {t('sch.eidNote')}
              </AppText>
            </View>
            <View style={styles.switchRow}>
              <AppText size={14} weight="bold" style={styles.flex}>
                {t('sch.dateConfirmed')}
              </AppText>
              <Switch
                value={dateConfirmed}
                onChange={setDateConfirmed}
                accessibilityLabel={t('sch.dateConfirmed')}
              />
            </View>
          </>
        )}

        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText size={14} weight="bold">
              {t('sch.remindMe')}
            </AppText>
            <AppText size={12} color="muted">
              {repeat.kind === 'weekly'
                ? t('sch.remindHintWeekly')
                : repeat.kind === 'daily'
                  ? t('sch.remindHintDaily')
                  : t('sch.remindHintOnce')}
            </AppText>
          </View>
          <Switch
            testID="special-remind"
            value={remind}
            onChange={setRemind}
            accessibilityLabel={t('sch.remindMe')}
          />
        </View>

        <Button testID="special-save" label={t('sch.saveSpecial')} loading={busy} onPress={save} />
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
  sheet: { borderRadius: radii.sheet, maxHeight: '92%', backgroundColor: 'rgba(255,255,255,0.96)' },
  content: { padding: 20, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: -10,
  },
  row: { flexDirection: 'row', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flex: { flex: 1 },
  note: { backgroundColor: colors.accentBg, borderRadius: 14, padding: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
