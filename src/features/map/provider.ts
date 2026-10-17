import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

/** Google Maps on Android; Apple Maps on iOS for now (owner decision, 2026-10-18). */
export const MAP_PROVIDER = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;
