import { useTranslation } from 'react-i18next';
import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { useLanguage } from '@/i18n/useLanguage';
import { colors } from '@/theme/tokens';
import { fontFamilyFor } from '@/theme/typography';

type ScreenOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack.Screen>['options']>,
  (...args: never[]) => unknown
>;

/**
 * Native stack header options (owner decision: platform back button everywhere).
 * Light screens: background-coloured bar, emerald back chevron.
 */
export function useNativeHeader(title = ''): ScreenOptions {
  const { t } = useTranslation();
  const { language } = useLanguage();
  return {
    headerShown: true,
    title,
    headerBackTitle: t('common.back'),
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontFamily: fontFamilyFor(language, 'extrabold'), color: colors.ink },
  };
}

/** Transparent header over an emerald hero (masjid detail, dashboard). */
export function useNativeHeaderOnPrimary(): ScreenOptions {
  const base = useNativeHeader();
  return {
    ...base,
    headerTransparent: true,
    headerStyle: { backgroundColor: 'transparent' },
    headerTintColor: colors.white,
  };
}
