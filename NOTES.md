# NOTES — decisions & open questions

Living log of decisions not spelled out in PLAN.md, deviations, and things the owner must provide.

## Versions (checked 2026-10-17)

- Expo SDK **58** (expo 58.0.x, React Native 0.88, React 19.3, TypeScript 6.0)
- Firebase JS SDK **13.0** (Expo requires ≥ 12)
- i18next 26 / react-i18next 17, zustand 5, @tanstack/react-query 5, zod 4

## Decisions / deviations from PLAN.md

1. **Routes live in `src/app/`** (Expo SDK 58 template default) instead of top-level `app/`. Same file layout as PLAN §3, just under `src/`.
2. **`app.config.ts`** instead of `app.json`, so the Android Google Maps key is read from env at build time.
3. **Bundle id / package:** `com.ahsan.waqtejamaat` (from FIREBASE_SETUP.md). Change before the first store build if needed.
4. **Native tabs:** SDK 58 ships `expo-router/native-tabs` as stable → used for the namazi tab bar (PLAN §9 "native tabs if available").
5. **Firebase Auth types:** `firebase/auth`'s package `types` don't follow the `react-native` condition, so `getReactNativePersistence` was invisible to TS. `tsconfig.json` maps `firebase/auth` to `@firebase/auth/dist/rn/index.rn.d.ts` (runtime already resolves the RN build via Metro).
6. **Emulator host:** `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` override → Metro dev-server host → `10.0.2.2` (Android emulator) / `127.0.0.1` (iOS sim). Emulators bind `0.0.0.0` so LAN devices work.
7. **Emulator project id:** `demo-waqt-e-jamaat` (`demo-` prefix = offline emulator project, no real credentials needed).
8. **Glass on Android:** plain translucent white (`rgba(255,255,255,0.9)`) instead of `expo-blur`. `expo-blur` on Android now needs a `BlurTargetView` wrapping the blurred content, which doesn't work over a native map view. iOS < 26 uses `BlurView` + 72% white tint; iOS 26+ uses `GlassView`.
9. **RTL reload:** `Updates.reloadAsync()` with fallback to `DevSettings.reload()` (expo-updates is disabled in debug builds). On boot, if the native direction doesn't match the saved language, the app flips and reloads once.
10. **Fonts** are loaded at runtime with `useFonts` from `@expo-google-fonts/*` while the native splash is held.
11. **First launch** goes to Welcome (language pill on Welcome opens the Language screen), matching the mockup flow Splash → Welcome.

## Owner must provide (from Firebase console etc.)

See `.env.example` and FIREBASE_SETUP.md. Summary:
- `EXPO_PUBLIC_FIREBASE_*` web config (7 values) and set `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME`
- `GOOGLE_MAPS_ANDROID_API_KEY`
- `GoogleService-Info.plist`, `google-services.json` (git-ignored)
- Service-account JSON for `scripts/set-admin.ts` / `approve-masjid.ts` (keep outside the repo)

## Open questions

- (none yet)
