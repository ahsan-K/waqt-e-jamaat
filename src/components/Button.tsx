import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { colors } from '@/theme/tokens';

import { AppText } from './AppText';
import { Touchable } from './Pressable';

type Variant =
  'primary' | 'secondary' | 'outline' | 'outlinePrimary' | 'ghost' | 'danger' | 'accent';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'lg' | 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

const heights = { lg: 56, md: 48, sm: 44 } as const;

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.primarySoft, fg: colors.primary },
  outline: { bg: colors.surface, fg: colors.ink, border: colors.border },
  outlinePrimary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
  ghost: { bg: 'transparent', fg: colors.primary },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.border },
  accent: { bg: colors.accentBg, fg: colors.accentText },
};

/** Capsule button (radius = height / 2). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  icon,
  style,
  accessibilityLabel,
  testID,
}: Props) {
  const p = palette[variant];
  const h = heights[size];
  const inactive = disabled || loading;
  return (
    <Touchable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        {
          minHeight: h,
          borderRadius: h / 2,
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? (variant === 'outlinePrimary' ? 1.5 : 1) : 0,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <AppText size={size === 'lg' ? 16 : 14} weight="extrabold" color={p.fg}>
            {label}
          </AppText>
        </View>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
