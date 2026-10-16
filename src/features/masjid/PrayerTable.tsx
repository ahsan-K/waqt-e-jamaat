import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { formatTime, rowLabel } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import type { ScheduleRow } from '@/lib/schedule';
import { colors } from '@/theme/tokens';

type Props = { rows: ScheduleRow[]; nextKey: string | null };

/** Today's azaan + jamaat table; next jamaat highlighted with an amber dot (Detail mockup). */
export function PrayerTable({ rows, nextKey }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  return (
    <View style={styles.card}>
      {rows.map((r, i) => {
        const isNext = r.key === nextKey;
        const label = rowLabel(r, language, t);
        const azaan = r.kind === 'prayer' ? r.azaan : r.special.times.khutba;
        const jamaat =
          r.kind === 'special'
            ? r.jamaatTimes.map((x) => formatTime(x, language)).join(' / ')
            : formatTime(r.jamaat, language);
        return (
          <View
            key={r.key}
            testID={`row-${r.key}`}
            style={[styles.row, i < rows.length - 1 && styles.divider]}
            accessible
            accessibilityLabel={`${label}, ${azaan ? formatTime(azaan, language) + ', ' : ''}${jamaat}${isNext ? ', ' + t('detail.nextJamaat') : ''}`}
          >
            <View style={styles.nameCell}>
              {isNext && <View style={styles.dot} />}
              <AppText size={15} weight={isNext ? 'extrabold' : 'semibold'} numberOfLines={1}>
                {label}
                {r.kind === 'special' && r.expected ? ` (${t('detail.expected')})` : ''}
              </AppText>
            </View>
            <AppText size={14} color="muted" style={styles.azaan} align="right">
              {azaan ? formatTime(azaan, language) : ''}
            </AppText>
            <AppText
              size={15}
              weight="extrabold"
              color="primary"
              style={styles.jamaat}
              align="right"
            >
              {jamaat}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ECEAE3' },
  nameCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  azaan: { width: 72, textAlign: 'right' },
  jamaat: { minWidth: 84, textAlign: 'right' },
});
