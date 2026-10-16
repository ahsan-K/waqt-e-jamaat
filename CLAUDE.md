# Waqt-e-Jamaat — standing instructions for the coding agent

- **Source of truth:** `PLAN.md` (what to build, data model, rules, phases) and `design/` (how it must look). App icon and splash images are in `assets/`.
- Build **one phase at a time** from PLAN.md §12. After each phase: run `npx tsc --noEmit`, `npx expo lint` and the tests, summarise what changed, list anything you deviated from, then **stop and wait** for approval.
- Match the mockups in `design/mockups/` screen by screen (layout, colours, radii, copy, states). Read `design/README.md` for the file → route map.
- Until the real Firebase project exists, develop against the **Firebase Emulator Suite** (Auth + Realtime Database) with values from `.env`; never hard-code keys. Keep `.env.example` up to date.
- Check current Expo / Firebase / AlAdhan docs before using an API; install Expo packages with `npx expo install`. If PLAN.md is outdated or wrong somewhere, say so and propose a fix instead of silently changing it.
- TypeScript strict. Logic in `src/lib` must be pure and unit-tested.
- Every UI string goes through i18n (`en`, `ur`, `ur-Latn`); use logical (start/end) styles so Urdu RTL works.
- Every icon-only button needs an `accessibilityLabel`; touch targets ≥ 44 pt.
- Keep `NOTES.md` with decisions and open questions.
