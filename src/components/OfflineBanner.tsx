import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useConnection } from '@/hooks/useConnection';
import { colors } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** "You're offline — showing saved data" (PLAN §12 Phase 6: usable with no network). */
export function OfflineBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  const connected = useConnection();
  if (connected) return null;
  return (
    <View style={[styles.banner, style]} accessibilityLiveRegion="polite" testID="offline-banner">
      <Icon name="alert" size={16} color={colors.white} />
      <AppText size={13} weight="bold" color="white" style={styles.text}>
        {t('common.offline')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { flex: 1 },
});
