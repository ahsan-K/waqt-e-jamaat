import { I18nManager, NativeModules, Platform } from 'react-native';

export type DeviceLocale = { languageCode: string | null; regionCode: string | null };

/** Parse "ur-PK" / "ur_PK" / "en-Latn-GB" into language + region. Pure, unit-tested. */
export function parseLocaleTag(tag: string | null | undefined): DeviceLocale {
  if (!tag) return { languageCode: null, regionCode: null };
  const parts = tag.replace(/_/g, '-').split('-');
  const languageCode = parts[0]?.toLowerCase() || null;
  const region = parts.slice(1).find((p) => /^[A-Za-z]{2}$|^\d{3}$/.test(p));
  return { languageCode, regionCode: region ? region.toUpperCase() : null };
}

/**
 * Device locales without expo-localization. (expo-localization resets
 * I18nManager.forceRTL on every iOS launch, which breaks our per-app Urdu RTL.)
 */
export function getDeviceLocales(): DeviceLocale[] {
  const tags: string[] = [];
  if (Platform.OS === 'ios') {
    const settings = NativeModules.SettingsManager?.settings as
      { AppleLanguages?: string[]; AppleLocale?: string } | undefined;
    tags.push(...(settings?.AppleLanguages ?? []));
    if (settings?.AppleLocale) tags.push(settings.AppleLocale);
  } else {
    const id = (I18nManager.getConstants() as { localeIdentifier?: string }).localeIdentifier;
    if (id) tags.push(id);
  }
  if (tags.length === 0) tags.push(Intl.DateTimeFormat().resolvedOptions().locale);
  return tags.map(parseLocaleTag);
}
