import type { ConfigContext, ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'com.ahsan.waqtejamaat';
const GOOGLE_IOS_URL_SCHEME = process.env.GOOGLE_IOS_URL_SCHEME;
const GOOGLE_MAPS_IOS_API_KEY = process.env.GOOGLE_MAPS_IOS_API_KEY;

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
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || 'MISSING_GOOGLE_MAPS_ANDROID_KEY',
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
