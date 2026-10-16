import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_500Medium,
  NotoNastaliqUrdu_600SemiBold,
  NotoNastaliqUrdu_700Bold,
} from '@expo-google-fonts/noto-nastaliq-urdu';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { JsSplash } from '@/components/JsSplash';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useNamaziSync } from '@/features/notifications/useNamaziSync';
import { ensureDirection } from '@/i18n/applyLanguage';
import { listenForTaps } from '@/services/notifications';
import { queryClient, queryPersister } from '@/services/queryClient';
import { useSettings } from '@/store/settings';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

const JS_SPLASH_MS = 1200;

/** Background effects that need auth + providers (local notifications, inbox). */
function AppEffects() {
  useNamaziSync();
  useEffect(() => listenForTaps(), []);
  return null;
}

function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    NotoNastaliqUrdu_400Regular,
    NotoNastaliqUrdu_500Medium,
    NotoNastaliqUrdu_600SemiBold,
    NotoNastaliqUrdu_700Bold,
  });
  const hydrated = useSettings((s) => s.hydrated);
  const language = useSettings((s) => s.language);
  const { ready: authReady } = useAuth();
  const [showJsSplash, setShowJsSplash] = useState(true);

  const fontsReady = fontsLoaded || !!fontError;
  const ready = fontsReady && hydrated && authReady;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Native layout direction must match the saved language; flip + reload once if not.
    void ensureDirection(language).then((reloading) => {
      if (reloading || cancelled) return;
      void SplashScreen.hideAsync();
      timer = setTimeout(() => setShowJsSplash(false), JS_SPLASH_MS);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when ready
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="language" options={{ presentation: 'card' }} />
        <Stack.Screen name="(namazi)" options={{ animation: 'fade' }} />
      </Stack>
      <AppEffects />
      {showJsSplash && <JsSplash />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister, maxAge: 7 * 24 * 60 * 60 * 1000 }}
        >
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
