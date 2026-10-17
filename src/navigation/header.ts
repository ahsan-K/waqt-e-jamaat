import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Stack } from 'expo-router';
import { createElement, type ComponentProps } from 'react';

import { useLanguage } from '@/i18n/useLanguage';
import { colors } from '@/theme/tokens';
import { fontFamilyFor } from '@/theme/typography';

import { RoundBackButton } from './RoundBackButton';

type ScreenOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack.Screen>['options']>,
  (...args: never[]) => unknown
>;

/**
 * Native stack header options (owner decision: platform back button everywhere).
 * Light screens: background-coloured bar, emerald back chevron. On Android a round back button
 * (matching iOS 26) replaces the default arrow.
 */
export function useNativeHeader(title = ''): ScreenOptions {
  const { t } = useTranslation();
  const { language } = useLanguage();
  return {
    headerShown: true,
    title,
    headerBackTitle: t('common.back'),
    // Chevron only: iOS 26 renders it as the round Liquid Glass back button.
    headerBackButtonDisplayMode: 'minimal',
    headerShadowVisible: false,
    // iOS: keep the system bar (transparent at scroll edge) so iOS 26 draws Liquid Glass
    // bar buttons; a solid custom colour would disable the glass back button.
    headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: colors.background },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontFamily: fontFamilyFor(language, 'extrabold'), color: colors.ink },
    ...androidRoundBack('light'),
  };
}

/** Android: replace the arrow with the same round back button iOS 26 shows natively. */
function androidRoundBack(variant: 'light' | 'onPrimary'): ScreenOptions {
  if (Platform.OS !== 'android') return {};
  return {
    headerBackVisible: false,
    headerLeft: ({ canGoBack }) => (canGoBack ? createElement(RoundBackButton, { variant }) : null),
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
    ...androidRoundBack('onPrimary'),
  };
}
