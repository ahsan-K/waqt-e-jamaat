import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Touchable } from './Pressable';

type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
};

/** 52×32 switch from the mockups (emerald on, grey off). */
export function Switch({ value, onChange, accessibilityLabel, testID, disabled }: Props) {
  return (
    <Touchable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[
        styles.track,
        { backgroundColor: value ? colors.primary : '#C9CCC7', opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <View style={[styles.thumb, value ? styles.on : styles.off]} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  on: { alignSelf: 'flex-end' },
  off: { alignSelf: 'flex-start' },
});
