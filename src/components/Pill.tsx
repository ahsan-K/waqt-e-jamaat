import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, TOUCH } from '@/theme/tokens';

import { AppText } from './AppText';
import { Touchable } from './Pressable';

type PillProps = {
  label: string;
  on: boolean;
  onPress: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** Selectable capsule (Profile minutes/radius, filters, type pills). */
export function Pill({ label, on, onPress, testID, style }: PillProps) {
  return (
    <Touchable
      testID={testID}
      onPress={onPress}
      accessibilityState={{ selected: on }}
      style={[
        styles.pill,
        {
          borderColor: on ? colors.primary : '#DAD6CB',
          backgroundColor: on ? colors.primary : colors.surface,
        },
        style,
      ]}
    >
      <AppText size={14} weight="extrabold" color={on ? 'white' : 'ink'} numberOfLines={1}>
        {label}
      </AppText>
    </Touchable>
  );
}

type SegmentedProps<T extends string> = {
  options: { value: T; label: string; testID?: string }[];
  value: T;
  onChange: (v: T) => void;
};

/** Two-up segmented control (Register | Login, Rozana | Special). */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Touchable
            key={o.value}
            testID={o.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, on && styles.segOn]}
          >
            <AppText size={14} weight="extrabold">
              {o.label}
            </AppText>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: TOUCH,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seg: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#ECE9E0', borderRadius: 26 },
  segItem: {
    flex: 1,
    minHeight: TOUCH,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOn: { backgroundColor: colors.surface },
});
