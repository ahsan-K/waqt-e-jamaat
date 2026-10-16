import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { DevSettings, I18nManager } from 'react-native';

import { useSettings } from '@/store/settings';

import i18n from './index';
import { isRTL, type Language } from './languages';

const PENDING_KEY = 'direction-reload-pending';

/** True when the native layout direction doesn't match the language (needs a reload). */
export function needsDirectionChange(language: Language): boolean {
  return I18nManager.isRTL !== isRTL(language);
}

export async function reloadApp() {
  try {
    await Updates.reloadAsync();
  } catch {
    // expo-updates is disabled in development builds; fall back to a JS reload.
    DevSettings.reload();
  }
}

async function flipDirectionAndReload(rtl: boolean) {
  // Guard against reload loops if a JS-only reload doesn't pick up the new direction.
  const pending = await AsyncStorage.getItem(PENDING_KEY);
  if (pending === String(rtl)) {
    await AsyncStorage.removeItem(PENDING_KEY);
    return false;
  }
  await AsyncStorage.setItem(PENDING_KEY, String(rtl));
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  // Give zustand-persist a tick to flush to AsyncStorage before reloading.
  setTimeout(() => void reloadApp(), 600);
  return true;
}

/** Boot-time check. Returns true when the app is reloading to fix the layout direction. */
export async function ensureDirection(language: Language): Promise<boolean> {
  if (!needsDirectionChange(language)) {
    await AsyncStorage.removeItem(PENDING_KEY);
    return false;
  }
  return flipDirectionAndReload(isRTL(language));
}

/**
 * Switch UI language. Returns true when the app is about to reload to flip RTL/LTR —
 * callers should show the "app restart ho rahi hai" state.
 */
export async function applyLanguage(language: Language): Promise<boolean> {
  useSettings.getState().setLanguage(language);
  await i18n.changeLanguage(language);
  if (!needsDirectionChange(language)) return false;
  await AsyncStorage.removeItem(PENDING_KEY);
  return flipDirectionAndReload(isRTL(language));
}
