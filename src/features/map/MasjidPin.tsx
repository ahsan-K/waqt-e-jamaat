import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme/tokens';

type Props = { estimated: boolean; label?: string | null; count?: number };

/** Emerald pin with mosque glyph (grey when timings are estimated); optional label chip. */
export function MasjidPin({ estimated, label, count }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.pin, { backgroundColor: estimated ? colors.pinGrey : colors.primary }]}>
        {count ? (
          <AppText size={13} weight="extrabold" color="white" script="latin">
            {count}
          </AppText>
        ) : (
          <Icon name="mosque" size={18} color={colors.white} strokeWidth={1.8} />
        )}
      </View>
      {label ? (
        <View style={styles.label}>
          <AppText size={12} weight="bold" numberOfLines={1}>
            {label}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  label: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});
