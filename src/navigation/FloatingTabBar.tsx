import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { Touchable } from '@/components/Pressable';
import { colors } from '@/theme/tokens';

export const FLOATING_TAB_HEIGHT = 68;
const FLOATING_TAB_BOTTOM = 18;

/** Extra bottom space screens leave for the floating bar (Android only; iOS uses native tabs). */
export function tabBarSpace(): number {
  return Platform.OS === 'android' ? FLOATING_TAB_HEIGHT + FLOATING_TAB_BOTTOM : 0;
}

export type TabMeta = { icon: IconName; label: string; testID?: string };

/**
 * Floating pill tab bar from the mockups (Main / Favourites / Profile): translucent white,
 * radius 34, active tab on a soft-emerald capsule. Used on Android to match the iOS look.
 */
export function FloatingTabBar({
  state,
  navigateToTab,
  insets,
  meta,
}: BottomTabBarProps & { meta: Record<string, TabMeta> }) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + FLOATING_TAB_BOTTOM }]}
    >
      <Glass style={styles.bar}>
        {state.routes.map((route, i) => {
          const m = meta[route.name];
          if (!m) return null;
          const focused = state.index === i;
          return (
            <Touchable
              key={route.key}
              testID={m.testID}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={m.label}
              onPress={() => !focused && navigateToTab(route.key)}
              pressedOpacity={0.6}
              hitSlop={0}
              style={[styles.item, focused && styles.itemOn]}
            >
              <Icon name={m.icon} size={22} color={focused ? colors.primary : '#3E4A45'} />
              <AppText
                size={11}
                weight={focused ? 'extrabold' : 'bold'}
                color={focused ? 'primary' : '#3E4A45'}
                numberOfLines={1}
              >
                {m.label}
              </AppText>
            </Touchable>
          );
        })}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', start: 16, end: 16 },
  bar: {
    height: FLOATING_TAB_HEIGHT,
    padding: 6,
    gap: 4,
    flexDirection: 'row',
    borderRadius: 34,
    shadowColor: colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  item: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 1 },
  itemOn: { backgroundColor: colors.primarySoft },
});
