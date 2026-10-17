# Release guide — Waqt-e-Jamaat (Phase 7)

Everything that can be prepared in the repo is done. The steps below need your Apple, Google
Play, Firebase and Expo accounts.

## 1. Firebase (production)
Follow FIREBASE_SETUP.md, then:
```bash
firebase use --add                 # pick the real waqt-e-jamaat project
firebase deploy --only database    # deploys database.rules.json (tested by npm run test:rules)
```
Set the `admin` claim on your account: `npx tsx scripts/set-admin.ts <uid>` with
`USE_EMULATOR=false GOOGLE_APPLICATION_CREDENTIALS=~/keys/waqt-admin.json FIREBASE_DATABASE_URL=...`.
Approve masjids with `scripts/approve-masjid.ts <id>` (same env).

## 2. Expo / EAS
```bash
npm i -g eas-cli        # or: npx eas-cli@latest <cmd>
eas login
eas init                # links the project, adds extra.eas.projectId to the config
```
Create the environment variables for the `preview` and `production` environments
(`eas env:create` or expo.dev → Project → Environment variables). Plain-text is fine for
`EXPO_PUBLIC_*`; use "secret" for the Maps keys:

| Variable | Where it comes from |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._DATABASE_URL`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID` | Firebase web app config |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME` | Firebase Auth → Google / GoogleService-Info.plist |
| `GOOGLE_MAPS_ANDROID_API_KEY`, `GOOGLE_MAPS_IOS_API_KEY` | Google Cloud console (restricted keys) |

`EXPO_PUBLIC_USE_FIREBASE_EMULATOR` is already forced to `false` for preview/production in eas.json.

## 3. Credentials
- iOS: `eas credentials -p ios` (EAS can create the distribution certificate + profile).
  Enable **Sign in with Apple** for the App ID (developer.apple.com).
- Android: `eas credentials -p android` → note the **SHA-1** of the upload key and add it to
  Firebase (Google sign-in) and to the Android Maps key restriction. After the first Play upload,
  also add the **Play App Signing** SHA-1.

## 4. Builds
```bash
eas build -p ios --profile production
eas build -p android --profile production
```
Internal test builds without the stores: `eas build --profile preview` (APK / ad-hoc).

## 5. Submit to TestFlight / Play internal testing
1. Create the app in App Store Connect (bundle id `com.ahsan.waqtejamaat`) and in Play Console
   (package `com.ahsan.waqtejamaat`).
2. Put the App Store Connect app id + team id in `eas.json → submit.production.ios`, and a Play
   service-account JSON at `../keys/play-service-account.json` (outside the repo).
3. `eas submit -p ios --profile production` and `eas submit -p android --profile production`.
4. Store text: `store/listing.en.md`, `store/listing.ur.md`. Privacy policy: host
   `store/privacy-policy.md` (fill in contact details) and use its URL in both stores.
5. Data-safety / App Privacy answers: location (approximate + precise, app functionality, not
   linked to identity, not stored); name + email (account management, linked); user content
   (reports/requests, app functionality); no tracking, no ads, no analytics.

## 6. Pre-release checklist
- [ ] `npm run typecheck && npm run lint && npm test && npm run test:rules:ci`
- [ ] Maestro flows on a preview build (`.maestro/`)
- [ ] Maps tiles load on both platforms with the release keys
- [ ] Google + Apple sign-in on real devices (Apple shown on iOS whenever Google is)
- [ ] Notification permission is asked only when turning on a reminder / saving a special
- [ ] Urdu RTL layout + Nastaliq on a real device
