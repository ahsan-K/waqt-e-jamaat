import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Touchable } from '@/components/Pressable';
import { formatKm, formatMinutesLeft, masjidName, nextShortLabel } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { localizeDigits } from '@/lib/digits';
import { colors, radii } from '@/theme/tokens';

import type { NearbyItem } from './useNearby';

type Props = {
  items: NearbyItem[];
  radiusKm: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function NearbySheet({ items, radiusKm, loading, error, onRetry }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const top = items.slice(0, 3);

  return (
    <Glass style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <AppText size={18} weight="extrabold" accessibilityRole="header">
          {t('map.nearby')}
        </AppText>
        <AppText size={13} weight="semibold" color="muted" testID="nearby-count">
          {t('map.count', {
            count: items.length,
            n: localizeDigits(items.length, language),
            km: localizeDigits(radiusKm, language),
          })}
        </AppText>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={styles.state} />
      ) : error && items.length === 0 ? (
        <View style={styles.state}>
          <AppText size={14} color="muted">
            {t('map.loadError')}
          </AppText>
          <Button label={t('common.retry')} size="sm" variant="secondary" onPress={onRetry} />
        </View>
      ) : top.length === 0 ? (
        <AppText size={14} color="muted" style={styles.state}>
          {t('map.none')}
        </AppText>
      ) : (
        <View style={styles.list}>
          {top.map((m) => {
            const name = m.masjid ? masjidName(m.masjid, language) : '…';
            const label = nextShortLabel(m.next, language, t) ?? t('map.noTimings');
            return (
              <Touchable
                key={m.id}
                testID={`nearby-${m.id}`}
                style={styles.row}
                onPress={() => router.push({ pathname: '/masjid/[id]', params: { id: m.id } })}
                accessibilityLabel={`${name}, ${formatKm(m.distanceKm, language, t)}, ${label}`}
              >
                <View style={styles.rowIcon}>
                  <Icon name="mosqueSimple" color={colors.primary} strokeWidth={1.8} />
                </View>
                <View style={styles.rowText}>
                  <AppText size={15} weight="bold" numberOfLines={1}>
                    {name}
                  </AppText>
                  <AppText size={12} color="muted">
                    {t('map.away', { dist: formatKm(m.distanceKm, language, t) })}
                  </AppText>
                </View>
                <View style={styles.rowEnd}>
                  <AppText size={15} weight="extrabold" color={m.estimated ? 'muted' : 'primary'}>
                    {label}
                  </AppText>
                  {m.estimated ? (
                    <View style={[styles.chip, styles.chipGrey]}>
                      <AppText size={11} weight="bold" color="muted">
                        {t('map.estimate')}
                      </AppText>
                    </View>
                  ) : m.next ? (
                    <View style={styles.chip}>
                      <AppText size={11} weight="bold" color="accentText">
                        {formatMinutesLeft(m.next.minutesLeft, language, t)}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </Touchable>
            );
          })}
        </View>
      )}
    </Glass>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: radii.sheet,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D9D6',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  list: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, minHeight: 48 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  rowEnd: { alignItems: 'flex-end', gap: 2 },
  chip: {
    backgroundColor: colors.accentBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipGrey: { backgroundColor: '#ECEDEA' },
  state: { paddingVertical: 16, alignItems: 'center', gap: 10 },
});
