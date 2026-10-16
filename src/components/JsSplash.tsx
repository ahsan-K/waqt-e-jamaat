import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { AppText } from './AppText';
import { Logo } from './Logo';

function Dot({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(reduce ? 1 : 0.35);
  useEffect(() => {
    if (reduce) return;
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0.35, { duration: 600 })),
        -1,
      ),
    );
  }, [delay, opacity, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** JS splash shown briefly after the native splash (Splash mockup). */
export function JsSplash() {
  return (
    <Animated.View
      exiting={FadeOut.duration(350)}
      style={[StyleSheet.absoluteFill, styles.root]}
      accessibilityLabel="Waqt-e-Jamaat"
      testID="js-splash"
    >
      <Svg width={420} height={300} viewBox="0 0 420 300" fill="none" style={styles.arches}>
        <Path
          d="M30 300V170a70 70 0 0 1 140 0v130"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={2}
        />
        <Path
          d="M250 300V140a80 80 0 0 1 160 0v160"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={2}
        />
        <Path
          d="M290 300V155a40 40 0 0 1 80 0v145"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={2}
        />
      </Svg>
      <View style={styles.tile}>
        <Logo size={92} animated />
      </View>
      <View style={styles.names}>
        <AppText script="latin" size={32} weight="extrabold" color="white" style={styles.brand}>
          Waqt-e-Jamaat
        </AppText>
        <AppText script="urdu" size={22} weight="bold" color="onPrimaryMuted">
          وقتِ جماعت
        </AppText>
      </View>
      <View style={styles.dots}>
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    zIndex: 100,
  },
  arches: { position: 'absolute', start: -15, bottom: 0 },
  tile: {
    width: 132,
    height: 132,
    borderRadius: 38,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  names: { alignItems: 'center', gap: 2 },
  brand: { letterSpacing: -0.6 },
  dots: { position: 'absolute', bottom: 72, flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
});
