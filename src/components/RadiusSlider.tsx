import { useState } from 'react';
import { I18nManager, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, TOUCH } from '@/theme/tokens';

type Props = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  accessibilityLabel: string;
  formatValue: (v: number) => string;
};

const THUMB = 26;

/** Accessible stepped slider (1–5 km, step 0.5) built on gesture-handler; mirrors in RTL. */
export function RadiusSlider({
  value,
  min = 1,
  max = 5,
  step = 0.5,
  onChange,
  accessibilityLabel,
  formatValue,
}: Props) {
  const [width, setWidth] = useState(0);
  const rtl = I18nManager.isRTL;
  const usable = Math.max(1, width - THUMB);
  const frac = (value - min) / (max - min);

  const snap = (x: number) => {
    const raw = (rtl ? usable - (x - THUMB / 2) : x - THUMB / 2) / usable;
    const clamped = Math.min(1, Math.max(0, raw));
    const v = Math.round((min + clamped * (max - min)) / step) * step;
    if (v !== value) onChange(+v.toFixed(2));
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => scheduleOnRN(snap, e.x))
    .onUpdate((e) => scheduleOnRN(snap, e.x));

  const adjust = (dir: 1 | -1) => {
    const v = Math.min(max, Math.max(min, value + dir * step));
    if (v !== value) onChange(v);
  };

  const fillWidth = THUMB / 2 + frac * usable;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.hit}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min, max, now: value, text: formatValue(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => adjust(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <View style={styles.track} />
        <View style={[styles.fill, { width: fillWidth }]} />
        <View style={[styles.thumb, { start: frac * usable }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: { height: TOUCH - 8, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(15,92,74,0.18)' },
  fill: {
    position: 'absolute',
    start: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
