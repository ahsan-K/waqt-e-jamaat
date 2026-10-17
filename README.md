# Waqt-e-Jamaat (وقتِ جماعت)

Jamaat times of nearby masjids on a map, with a management side for masjid committees.
Expo SDK 58 · Expo Router · TypeScript · Firebase Auth + Realtime Database.

- Spec: [PLAN.md](PLAN.md) · design: [design/](design/) · decisions & status: [NOTES.md](NOTES.md)
- Firebase console steps: [FIREBASE_SETUP.md](FIREBASE_SETUP.md) · release: [RELEASE.md](RELEASE.md)

## Develop

```bash
npm install
cp .env.example .env          # defaults use the Firebase Emulator Suite
npm run emulators             # Auth + RTDB emulators (needs JDK 21+)
npm run seed                  # 15 approved test masjids around Karachi
npx expo start --dev-client   # then run a dev build:
npm run ios                   # or: npm run android
```

## Checks

```bash
npm run typecheck && npm run lint && npm test   # TS, ESLint, Jest (pure logic)
npm run test:rules                              # RTDB security rules (emulator running)
node scripts/e2e-link-test.mjs                  # guest → account linking (emulator running)
maestro test .maestro/phase2-map.yaml           # E2E flows (see NOTES.md → Testing)
```
