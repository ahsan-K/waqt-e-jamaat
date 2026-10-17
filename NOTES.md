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
12. **expo-localization removed.** Its iOS module resets `I18nManager.forceRTL` on every launch, which made the Urdu RTL flip impossible. Device locale now comes from `SettingsManager.AppleLanguages` (iOS) / `I18nManager.localeIdentifier` (Android) in `src/i18n/deviceLocale.ts`. `CFBundleLocalizations: [en, ur]` declared so iOS allows RTL.
13. **Google Maps on iOS and Android** (owner decision, overrides PLAN §2 Apple Maps). The iOS Google Maps SDK is only linked when `GOOGLE_MAPS_IOS_API_KEY` is set at build time — until then iOS dev builds fall back to Apple Maps (`src/features/map/provider.ts`). Android uses a placeholder key when none is set so dev builds don't crash (tiles stay blank until a real key is added).
14a. **Round back button on Android too** (owner request): `src/navigation/RoundBackButton.tsx` replaces the Android header arrow via `headerLeft`; iOS keeps the native (iOS 26 Liquid Glass) button.
14b. **"Continue as guest"** always goes to the map (`router.dismissTo('/map')`); login opened from Welcome continues to the map, login from a masjid's sign-in sheet returns to that masjid. The Welcome logo badge also opens the map.
14. **Native header back buttons everywhere** (owner decision, overrides the mockups' round back buttons): `src/navigation/header.ts` (`useNativeHeader`, `useNativeHeaderOnPrimary`). Header actions (share / favourite) live in `headerRight`.
15. **Radius slider** is a custom gesture-handler component (no extra native dep), accessible as an adjustable control, mirrored in RTL.
16. **Clustering** uses `supercluster` directly (react-native-map-clustering is unmaintained).
17. **Map search:** first matches loaded masjid names, otherwise geocodes the text with `expo-location` and re-centres. A "Search this area" button appears when the map is panned outside the radius.
18b. **Intezamia routes:** `/login`, `/register` (the 3-step wizard is one screen with internal steps + progress bar, so form state survives Back — PLAN §3 listed one file per step), `/dashboard` + `/schedule` as native tabs in `(intezamia)/(manage)`.
18c. **Rozana edits:** "Foran" edits the active daily entry (and future entries that still had the old value); "Kal se" / "Tareekh se" add an entry from that day's start (copy of the times then in force). Older entries are pruned on save; expired one-off / ranged specials are removed when a special is saved. Azaan in registration step 3 is derived from the jamaat time using the typical gap; editable in Schedule.
18d. **Management reminders** are local (19:00 the evening before; weekly every occurrence, daily range only before the first day, once before the date; next 30 days). Reports / timing requests are turned into inbox items live from RTDB.
18e. **Rules hardening (Phase 6):** field-level `.validate` (HH:mm, YYYY-MM-DD, enums, lengths, `$other: false`); favourites counter only moves together with the user's own favourite node; owners can't change lat/lng (besides status/geohash); `/geo/{id}/hasTimings` only writable when the geo node exists (approved).
18f. **Offline:** RTDB `.info/connected` drives an offline banner (4 s grace); React Query's persisted cache keeps map/detail usable without network.
18a. **RTDB root ref:** `ref(db, '')` is invalid in Firebase JS 13 — multi-path updates use `ref(db)` (`dbRef('')`).
18. **Routes `/masjid/[id]` deep-link:** `waqtejamaat://masjid/<id>`.
19. **AlAdhan:** `GET /v1/calendar/{year}/{month}?latitude&longitude&method&school&timezonestring` (verified 2026-10-17). Cached per rounded coords (2 dp) + method + school + month in AsyncStorage; current + next month kept.

## Owner must provide (from Firebase console etc.)

See `.env.example` and FIREBASE_SETUP.md. Summary:
- `EXPO_PUBLIC_FIREBASE_*` web config (7 values) and set `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME`
- `GOOGLE_MAPS_ANDROID_API_KEY`, `GOOGLE_MAPS_IOS_API_KEY` (Google Maps on both platforms)
- `GoogleService-Info.plist`, `google-services.json` (git-ignored)
- Service-account JSON for `scripts/set-admin.ts` / `approve-masjid.ts` (keep outside the repo)

## Testing

- Rules: `npm run test:rules` (emulator running) or `npm run test:rules:ci` (starts the RTDB emulator). 15 tests.
  NB: they clear the emulator database — run `npm run seed` afterwards.
  Verified: `increment()` inside a multi-path update is resolved before rule evaluation, so the
  "one per user" counter rules work as PLAN §8 assumed (no runTransaction fallback needed).

- Unit: `npm test` (Jest, pure libs in `src/lib`, AlAdhan parser/cache with a saved fixture).
- E2E: Maestro flows in `.maestro/` (needs Metro on :8081, `npm run emulators`, `npm run seed`, device location 24.8607,67.0011):
  `maestro test .maestro/phase1-language-rtl.yaml` etc.
- Firebase emulators need **JDK 21+** (firebase-tools 15).

## Status / resume point

- **Now running against the real Firebase project `waqt-e-jamaat`** (`.env`: `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false`).
  Rules deployed with `firebase deploy --only database --project prod`. Switch back to the
  emulator by setting it to `true` (and restart Metro with `--clear`); the React Query cache is
  kept per backend so data doesn't mix.
- Real E2E (2026-10-17): masjid registered from the app (Android) → approved via CLI → namazi on
  iOS: map, detail, login, reminder, confirm, report → intezamia: dashboard counters, report
  notification, Isha change → namazi gets the change alert. Flows: `.maestro/real-namazi.yaml`,
  `.maestro/real-intezamia.yaml` (pass `-e EMAIL=... [-e PASSWORD=...]`).
- Test data left in the real project: masjid "Masjid-e-Naya" (`-P4A6JI5-1zaaCbsd3un`, approved),
  its intezamia account, three `namazi.e2e.*@example.com` accounts and a couple of anonymous
  users. Delete them from the console before launch.
- Approving without a service account: `firebase database:update / approve.json --project prod`
  with `{"masjids/<id>/status":"approved","geo/<id>":{g,lat,lng,hasTimings}}`.

- All phases 1–7 done and committed. Phase 7 prepared everything repo-side (store listings in
  `store/`, privacy policy draft, EAS build/submit config, RELEASE.md); TestFlight / Play internal
  uploads need the owner's Apple / Google / Expo accounts (see RELEASE.md).
- Maestro flows pass on the iOS 26.5 simulator ("iPhone 17 Pro") and the Android emulator
  (phase5 register wizard: Android only).
- **Maps:** Google Maps on Android (tiles load now); **Apple Maps on iOS for now** (owner,
  2026-10-18). The iOS Google SDK is only linked with `USE_GOOGLE_MAPS_IOS=true` + the iOS key.
  After changing map config, rebuild the native app AND restart Metro with `--clear`.
- Map fits the radius circle around the user between the top cards and the bottom sheet
  (`fitToCoordinates` with measured overlay heights; Android edge padding is in pixels).
- Android tab bar = floating pill (`src/navigation/FloatingTabBar.tsx`); iOS keeps native tabs.
  Android has no backdrop blur over Google Maps (its surface can't be captured), so glass is a
  94% frosted white.
- Android map tiles don't load: Google rejects the key with **"You must enable Billing on the
  Google Cloud Project"** (checked via the Geocoding/Static Maps endpoints). Link a billing
  account to the key's project; keep the restriction `com.ahsan.waqtejamaat` + debug SHA-1
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. No rebuild needed after that.
  iOS key not set yet → iOS dev builds use Apple Maps.
- Maestro phase4 logs in with a user created through the Auth emulator REST API
  (`.maestro/scripts/create-user.js`); iOS strong-password autofill makes typing into the
  register form flaky in the simulator. Guest → account linking is checked by
  `node scripts/e2e-link-test.mjs`.
- Map screen has a round back button before the search bar (owner request) → Welcome.

## Open questions

- Android dev builds show the dev-client floating button over the header's top-right action; harmless in release builds.
