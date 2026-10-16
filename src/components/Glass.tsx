import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/theme/tokens';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `light`: white glass over map/content. `onPrimary`: translucent white over emerald. */
  variant?: 'light' | 'onPrimary';
  interactive?: boolean;
};

const liquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((v) => mounted && setReduce(v));
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Glass surface (PLAN §9): Liquid Glass on iOS 26+, blur on older iOS,
 * translucent view on Android / with Reduce Transparency. Tint stays ≥ 55% for AA text contrast.
 */
export function Glass({ children, style, variant = 'light', interactive }: Props) {
  const reduce = useReduceTransparency();
  const onPrimary = variant === 'onPrimary';
  const border = {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: onPrimary ? colors.glassOnPrimaryBorder : 'rgba(255,255,255,0.7)',
  };

  if (liquidGlass && !reduce) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="light"
        isInteractive={interactive}
        tintColor={onPrimary ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)'}
        style={[styles.clip, style]}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'ios' && !reduce) {
    return (
      <View style={[styles.clip, border, style]}>
        <BlurView
          tint={onPrimary ? 'light' : 'extraLight'}
          intensity={40}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: onPrimary ? colors.glassOnPrimary : colors.glassLight },
          ]}
        />
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.clip,
        border,
        { backgroundColor: onPrimary ? colors.glassOnPrimary : colors.glassLightFallback },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
