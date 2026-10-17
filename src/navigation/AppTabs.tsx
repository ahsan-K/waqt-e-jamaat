import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { colors } from '@/theme/tokens';

import { FloatingTabBar, type TabMeta } from './FloatingTabBar';

/** SF Symbol (iOS) and Material Symbol (unused on Android now, kept for native tabs). */
export type AppTab = TabMeta & { name: string; sf: string; md: string };

/**
 * Tab navigator: iOS keeps native tabs (Liquid Glass on iOS 26); Android gets the floating
 * pill bar from the mockups instead of the Material bottom navigation.
 */
export function AppTabs({ tabs }: { tabs: AppTab[] }) {
  if (Platform.OS === 'android') {
    const meta = Object.fromEntries(tabs.map((t) => [t.name, t]));
    return (
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
        tabBar={(props) => <FloatingTabBar {...props} meta={meta} />}
      >
        {tabs.map((t) => (
          <Tabs.Screen key={t.name} name={t.name} />
        ))}
      </Tabs>
    );
  }
  return (
    <NativeTabs tintColor={colors.primary}>
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          {/* Icon names are validated by the native module at runtime. */}
          <NativeTabs.Trigger.Icon {...({ sf: t.sf, md: t.md } as object)} />
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
