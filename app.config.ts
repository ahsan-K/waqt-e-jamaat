import type { ConfigContext, ExpoConfig } from 'expo/config';

import { existsSync } from 'node:fs';

const BUNDLE_ID = 'com.ahsan.waqtejamaat';
// Firebase platform config files (git-ignored; on EAS provide them as file env vars).
const IOS_GOOGLE_SERVICES = process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist';
const ANDROID_GOOGLE_SERVICES = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const GOOGLE_IOS_URL_SCHEME = process.env.GOOGLE_IOS_URL_SCHEME;
// iOS uses Apple Maps for now; set USE_GOOGLE_MAPS_IOS=true to link the Google Maps SDK again.
const GOOGLE_MAPS_IOS_API_KEY =
  process.env.USE_GOOGLE_MAPS_IOS === 'true' ? process.env.GOOGLE_MAPS_IOS_API_KEY : undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Waqt-e-Jamaat',
  slug: 'waqt-e-jamaat',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'waqtejamaat',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    ...(existsSync(IOS_GOOGLE_SERVICES) ? { googleServicesFile: IOS_GOOGLE_SERVICES } : {}),
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Declare Urdu so iOS lets RN flip to RTL for it.
      CFBundleLocalizations: ['en', 'ur'],
    },
  },
  android: {
    package: BUNDLE_ID,
    ...(existsSync(ANDROID_GOOGLE_SERVICES) ? { googleServicesFile: ANDROID_GOOGLE_SERVICES } : {}),
    adaptiveIcon: {
      backgroundColor: '#0F5C4A',
      foregroundImage: './assets/images/adaptive-icon.png',
      monochromeImage: './assets/images/adaptive-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'react-native-maps',
      {
        // Google Maps on both platforms (owner decision). The iOS Google Maps SDK is only
        // linked when an iOS key is present; until then iOS dev builds fall back to Apple Maps.
        // Placeholder keeps dev builds from crashing ("API key not found"); tiles need a real key.
        androidGoogleMapsApiKey:
          process.env.GOOGLE_MAPS_ANDROID_API_KEY || 'MISSING_GOOGLE_MAPS_ANDROID_KEY',
        ...(GOOGLE_MAPS_IOS_API_KEY ? { iosGoogleMapsApiKey: GOOGLE_MAPS_IOS_API_KEY } : {}),
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Waqt-e-Jamaat aapki location se qareeb ki masjidein aur unki jamaat timings dikhati hai. (Shows masjids near you.)',
      },
    ],
    'expo-apple-authentication',
    [
      'expo-notifications',
      {
        color: '#0F5C4A',
        icon: './assets/images/adaptive-icon-monochrome.png',
      },
    ],
    // Google sign-in needs the reversed iOS client id; skipped until Firebase config exists.
    ...(GOOGLE_IOS_URL_SCHEME
      ? [
          [
            '@react-native-google-signin/google-signin',
            { iosUrlScheme: GOOGLE_IOS_URL_SCHEME },
          ] as [string, object],
        ]
      : []),
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0F5C4A',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        dark: {
          backgroundColor: '#0F5C4A',
          image: './assets/images/splash-icon.png',
        },
      },
    ],
  ],
  extra: {
    iosGoogleMaps: !!GOOGLE_MAPS_IOS_API_KEY,
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
