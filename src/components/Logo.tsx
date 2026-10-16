import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

type Props = { size?: number; animated?: boolean };

/** Mehrab with amber clock (Splash mockup). Hand points to Asr; rotates when animated. */
export function Logo({ size = 92, animated = false }: Props) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const spin = animated && !reduceMotion;

  useEffect(() => {
    if (!spin) return;
    rotation.value = withRepeat(withTiming(360, { duration: 2400, easing: Easing.linear }), -1);
    return () => cancelAnimation(rotation);
  }, [spin, rotation]);

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <Path
          d="M18 86V50C18 34 31 24 48 13C65 24 78 34 78 50V86"
          stroke={colors.primary}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M10 86h76" stroke={colors.primary} strokeWidth={7} strokeLinecap="round" />
        <Path d="M48 13V4" stroke={colors.primary} strokeWidth={6} strokeLinecap="round" />
        <Circle cx={48} cy={58} r={17} fill={colors.accentBg} />
        <Path d="M48 58V47" stroke={colors.accentText} strokeWidth={5} strokeLinecap="round" />
      </Svg>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.handOrigin, handStyle]}
        pointerEvents="none"
      >
        <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
          <Path d="M48 58l8 6" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 96 96" style={StyleSheet.absoluteFill}>
        <Circle cx={48} cy={58} r={3} fill={colors.accentText} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Clock centre is (48, 58) in the 96×96 viewBox.
  handOrigin: { transformOrigin: ['50%', `${(58 / 96) * 100}%`, 0] },
});
