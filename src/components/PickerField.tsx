import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/i18n/useLanguage';
import { colors, radii } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Glass } from './Glass';
import { Touchable } from './Pressable';

type Mode = 'time' | 'date';

type Props = {
  mode: Mode;
  /** "HH:mm" for time, "YYYY-MM-DD" for date; empty = unset. */
  value: string;
  onChange: (v: string) => void;
  label?: string;
  display: string;
  placeholder?: string;
  error?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(mode: Mode, value: string): Date {
  const d = new Date();
  if (!value) return d;
  if (mode === 'time') {
    const [h, m] = value.split(':').map(Number);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d;
  }
  const [y, mo, day] = value.split('-').map(Number);
  return new Date(y ?? d.getFullYear(), (mo ?? 1) - 1, day ?? 1);
}

function fromDate(mode: Mode, d: Date): string {
  return mode === 'time'
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Tappable field that opens the native time/date picker (sheet on iOS, dialog on Android). */
export function PickerField({
  mode,
  value,
  onChange,
  label,
  display,
  placeholder,
  error,
  testID,
  style,
  compact,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toDate(mode, value));
  const locale = language === 'ur' ? 'ur-PK' : 'en-GB';

  const show = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(mode, value),
        mode,
        is24Hour: false,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(fromDate(mode, d));
        },
      });
      return;
    }
    setDraft(toDate(mode, value));
    setOpen(true);
  };

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <AppText size={13} weight="bold" color="#3E4A45">
          {label}
        </AppText>
      ) : null}
      <Touchable
        testID={testID}
        onPress={show}
        accessibilityLabel={`${label ?? ''} ${display || placeholder || ''}`.trim()}
        accessibilityHint={mode === 'time' ? t('sch.pickTime') : t('sch.pickDate')}
        style={[styles.field, compact && styles.compact, error ? styles.fieldError : null]}
      >
        <AppText size={16} weight={value ? 'bold' : 'medium'} color={value ? 'ink' : '#7A847F'}>
          {value
            ? display
            : (placeholder ?? (mode === 'time' ? t('sch.pickTime') : t('sch.pickDate')))}
        </AppText>
      </Touchable>
      {error ? (
        <AppText size={12} weight="semibold" color="danger">
          {error}
        </AppText>
      ) : null}
      {Platform.OS === 'ios' && (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel={t('common.close')}
          />
          <View
            style={[styles.sheetWrap, { paddingBottom: insets.bottom + 10 }]}
            pointerEvents="box-none"
          >
            <Glass style={styles.sheet}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                locale={locale}
                minuteInterval={mode === 'time' ? 5 : undefined}
                onChange={(_, d) => d && setDraft(d)}
                accentColor={colors.primary}
                themeVariant="light"
              />
              <Button
                label={t('common.done')}
                onPress={() => {
                  onChange(fromDate(mode, draft));
                  setOpen(false);
                }}
              />
            </Glass>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#DAD6CB',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  compact: { minHeight: 44, borderRadius: 22 },
  fieldError: { borderColor: colors.danger },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: 'rgba(20,32,28,0.35)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 10 },
  sheet: {
    borderRadius: radii.sheet,
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
});
