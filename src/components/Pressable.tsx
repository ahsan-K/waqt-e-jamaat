import {
  Pressable as RNPressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  pressedOpacity?: number;
};

/** Pressable with a uniform pressed-state opacity and a 44pt min hit area. */
export function Touchable({ style, pressedOpacity = 0.7, hitSlop = 6, ...rest }: Props) {
  return (
    <RNPressable
      accessibilityRole="button"
      hitSlop={hitSlop}
      {...rest}
      style={({ pressed }) => [style, pressed && { opacity: pressedOpacity }]}
    />
  );
}
