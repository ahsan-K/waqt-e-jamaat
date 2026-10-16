import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

/**
 * Google Maps on Android and iOS (owner decision). iOS only has the Google SDK linked when
 * GOOGLE_MAPS_IOS_API_KEY was set at build time; otherwise fall back to Apple Maps.
 */
const iosGoogle = !!(Constants.expoConfig?.extra as { iosGoogleMaps?: boolean } | undefined)
  ?.iosGoogleMaps;

export const MAP_PROVIDER =
  Platform.OS === 'ios' && !iosGoogle ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;
