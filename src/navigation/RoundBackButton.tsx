import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { Touchable } from '@/components/Pressable';
import { colors } from '@/theme/tokens';

type Props = { variant?: 'light' | 'onPrimary'; onPress?: () => void };

/**
 * Round back button for the Android header, matching the iOS 26 Liquid Glass back button
 * (owner request: same round button on both platforms). iOS keeps the native one.
 */
export function RoundBackButton({ variant = 'light', onPress }: Props) {
  const { t } = useTranslation();
  const onPrimary = variant === 'onPrimary';
  return (
    <Touchable
      testID="header-back"
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      accessibilityLabel={t('common.back')}
      hitSlop={4}
      style={[styles.btn, onPrimary ? styles.onPrimary : styles.light]}
    >
      <Icon name="back" size={22} color={onPrimary ? colors.white : colors.ink} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  onPrimary: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
