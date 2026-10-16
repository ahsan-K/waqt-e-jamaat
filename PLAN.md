# Waqt-e-Jamaat (وقتِ جماعت) — Build Plan

> App name: **Waqt-e-Jamaat** (Urdu: وقتِ جماعت). Use this name in app config, store listings and translations. This file is the source of truth for the build.
> Design mockups (all screens, clickable): https://claude.ai/artifact/9qSYU81TJaqmZaGWPkZ5Ne

## 0. Instructions for the coding agent

- Build **phase by phase** (section 12). Finish a phase, run `npx tsc --noEmit` and `npx expo lint`, show what changed, then stop and wait for approval before the next phase.
- Use **TypeScript strict** everywhere. No `any` unless commented why.
- Before adding any dependency, check the **current Expo SDK docs** for the correct install command (`npx expo install <pkg>`) and confirm it supports the SDK version in `package.json`.
- Never commit secrets. Firebase config goes in `.env` as `EXPO_PUBLIC_FIREBASE_*` variables; add `.env.example` with empty keys.
- Keep a short `CLAUDE.md` / `NOTES.md` updated with decisions you make that are not in this plan.
- If something in this plan is technically wrong or outdated, say so and propose an alternative instead of silently changing it.

---

## 1. Product summary

A mobile app that shows **jamaat (congregation) times of nearby masjids on a map**. Azaan times exist in many apps; jamaat times differ per masjid and are not available anywhere. That is the core value.

Two user types:

| Role | Login | Can do |
|---|---|---|
| **Namazi (guest)** | None (Firebase anonymous auth, invisible) | See map, radius search, masjid detail and schedules |
| **Namazi (registered)** | Apple / Google / email+password | Everything above + favourite masjids, jamaat reminders, confirm timings, timing-change alerts |
| **Intezamia** (masjid management) | Email + password | Register a masjid (name, address, coordinates, schedules), edit schedules, see status |

No OTP anywhere.

Languages: **English, Urdu (RTL, Nastaliq), Roman Urdu**.

---

## 2. Tech stack

- **Expo** (latest stable SDK) + **Expo Router** (file-based routing) + TypeScript
- **Development build via EAS** (`expo-dev-client`) — needed for Google/Apple sign-in and maps keys; do not rely on Expo Go.
- **Firebase** (JS modular SDK): Auth + **Realtime Database (RTDB)**. Auth persistence via AsyncStorage (`initializeAuth` + React Native persistence). Note: the JS SDK has no disk persistence for RTDB on React Native, so offline caching is done with React Query + `@tanstack/query-async-storage-persister`.
- **Maps:** `react-native-maps` (Apple Maps on iOS, Google Maps on Android — needs Android Maps API key in app config) + marker clustering.
- **Location:** `expo-location`
- **Geo queries:** `geofire-common` (geohash bounds + distance) against an RTDB `/geo` index ordered by child `g`
- **Calculated prayer times (fallback):** **AlAdhan REST API** (free, no key) — see section 6a
- **Notifications:** `expo-notifications` (local scheduled notifications only in MVP)
- **Glass UI:** `expo-glass-effect` (`GlassView`) on iOS; fallback with `expo-blur` / translucent view on Android (see section 9)
- **Auth providers:** `expo-apple-authentication`, Google sign-in library compatible with current Expo SDK (check docs), Firebase email/password
- **i18n:** `i18next`, `react-i18next`, `expo-localization`
- **State/data:** React Query (`@tanstack/react-query`) for RTDB reads (persisted to AsyncStorage) + small Zustand store for app settings (language, radius, reminder minutes)
- **Forms:** `react-hook-form` + `zod`
- **Fonts:** Manrope (Latin), Noto Nastaliq Urdu (Urdu) via `expo-font`

---

## 3. Navigation / route structure (Expo Router)

```
app/
  _layout.tsx                 # providers: i18n, QueryClient, Auth, fonts, theme
  index.tsx                   # redirect: first launch -> /welcome, else by role
  language.tsx                # language picker (modal-capable)
  welcome.tsx                 # choose Namazi or Intezamia

  (namazi)/
    _layout.tsx               # native tabs: Map | Meri masjidein | Profile
    map.tsx                   # map + radius slider + nearby sheet
    favourites.tsx            # requires registered user; else show sign-in prompt
    profile.tsx               # settings, language, logout
  masjid/[id].tsx             # masjid detail + schedule (shared by all roles)
  notifications.tsx           # notification list (content depends on role)
  auth/
    namazi.tsx                # Register | Login tabs, Apple, Google, email
    sign-in-sheet.tsx         # bottom sheet shown when guest taps favourite/reminder

  (intezamia)/
    login.tsx
    register/
      _layout.tsx             # 3-step wizard with progress bar
      account.tsx             # step 1: name, email, password, role in masjid
      masjid.tsx              # step 2: name (EN + UR), address, map pin
      timings.tsx             # step 3: daily + Jumu'ah timings
      submitted.tsx
    dashboard.tsx
    schedule.tsx              # edit: Rozana | Jumu'ah | Ramzan, effective date
```

---

## 4. Screens (match the mockups)

**Splash** — solid emerald `#0F5C4A` background, centred white rounded-square logo (mehrab/arch outline with a small amber clock inside, hand pointing to Asr), app name "Waqt-e-Jamaat" and Urdu "وقتِ جماعت" below. Native splash (`expo-splash-screen` config plugin) shows only the logo on the emerald background (light and dark the same); keep it visible until fonts, auth state and settings are loaded, then fade into an optional JS splash with the name and a 3-dot loader / rotating clock hand (respect reduce-motion). Max ~1.5 s after native splash; never wait on network.

**App icon & splash assets** (provided in `assets/`): `icon.png` (1024, emerald background, white pointed mehrab with amber clock — iOS, no transparency), `adaptive-icon.png` (Android foreground, transparent, inside safe zone; background colour `#0F5C4A`), `adaptive-icon-monochrome.png` (Android 13+ themed icon), `splash-icon.png` (logo on white rounded tile, transparent corners; splash background `#0F5C4A`, image width ≈ 200).

**Welcome** — app name, tagline, two glass cards (Namazi → map as guest; Intezamia → login), language pill top-right, "Namazi account hai? Login karein" link.

**Map** — full-bleed map, user location dot, dashed radius circle, masjid pins only inside radius, label on nearest pin with next jamaat. Top: glass search bar + "my location" button + glass radius card with slider (1–5 km, step 0.5, default from settings). Bottom: glass sheet "Qareeb masjidein" with count and top 3 by distance (name, distance, next jamaat, "X min mein"). Glass tab bar.

**Masjid detail** — header with name, address, distance; highlighted "Agli jamaat" card (prayer, time, minutes left, walking time); today's schedule table (azaan + jamaat for 5 prayers, next one highlighted); Jumu'ah row (khutba + jamaat); "Updated X days ago · N confirmed" + "Time sahi hai" button; "Time ghalat hai? Report" link; bottom glass bar: Directions (open native maps) + Reminder. Favourite star in header. Guest tapping star/reminder → sign-in sheet.

**Namazi auth** — Register/Login segmented control, Apple, Google, divider, email form, "Guest ke taur par jaari rakhein".

**Favourites** — cards: name, distance, next jamaat, upcoming-change note (amber) if a future schedule exists, per-masjid reminder switch.

**Profile** — user card, reminder lead time (5/10/15/20 min), default radius (1/2/3/5 km), timing-change alerts switch, calculation method + Asr madhab (for estimated times), language, logout.

**Language** — Roman Urdu / اردو / English with live preview; Urdu switches layout to RTL.

**Intezamia login** — email, password (show/hide), forgot password (Firebase reset email), register-new-masjid card.

**Register wizard** — step 1 account; step 2 masjid name in English and Urdu, address, draggable pin with "use current location", shows lat/lng; step 3 daily timings + Jumu'ah (creates a weekly Friday special); submitted screen ("verification pending").

**Dashboard** — masjid name, status badge (pending / approved), pending banner, **"Kal: <special>" card** when a special with management reminder is tomorrow (times + "Haan, sahi hain" → marks it confirmed, "Timings badlein" → opens that special in the editor), today's 5 timings, Jumu'ah line, upcoming changes, counts (favourites, confirmations), tabs Dashboard | Schedule, logout.

**Schedule editor** — two tabs only:
- **Rozana** — list of 5 prayers (name, azaan small, jamaat large, amber chip if a future change is scheduled, e.g. "6 Nov se jamaat 5:50"). Tapping a prayer opens an edit sheet:
  - Azaan and Jamaat each with −/+ steppers (5-minute steps; long-press or tap the time for a full time picker). Changed values turn amber and show "Pehle 8:00".
  - "Kab se lagu hoga": Foran | Kal se | Tareekh se (+ date picker). Foran updates the active `daily` entry; the others add a new `daily` entry with that `effectiveFrom` (copy of current times with this prayer changed).
  - "Namaziyon ko ittela bhejein" switch (default on) → marks the change so favourites get the timing-change alert.
  - Save button disabled until something changed; label "Abhi se lagu karein" or "Schedule karein".
  - Board-photo button stays on this tab (phase 2 OCR).
- **Special** — list of special prayers (Jumu'ah, Taraweeh, Eid-ul-Fitr, Eid-ul-Adha, or a custom one with its own name, e.g. Salat-ul-Kusoof). Each card shows times, a repeat chip and a date-range chip, plus Edit/Delete. "Special namaz add karein" opens a bottom sheet:
  - Type pills (picking a type pre-fills sensible defaults: Jumu'ah → weekly on Friday with Khutba + Jamaat; Taraweeh → daily with Shuru time; Eid → once with Pehli + Doosri jamaat; Custom → name field + Jamaat).
  - Time fields depend on type (see `SpecialPrayer.times` below).
  - **Repeat:** Ek dafa (once) | Har roz (daily) | Har hafte (weekly, choose weekday).
  - Dates: once → single date; daily → Kab se + Kab tak (required, e.g. Ramzan range); weekly → Kab se + Kab tak (optional = forever).
  - Eid shows a note that the date depends on moon sighting; entry can be saved with `dateConfirmed: false` and confirmed later.
  - **"1 din pehle mujhe yaad dilayein"** switch (management reminder). Default ON for once/daily specials, OFF for weekly (so Jumu'ah doesn't nag every Thursday unless they want it). Cards show a "1 din pehle yaad" chip when on.

---

**Notifications** — opened from a bell with unread badge (Map top bar for namazi, Dashboard header for intezamia). Back button, "Sab parh liye", unread count, filter chips, items grouped Aaj / Kal / Is hafte. Each item: coloured icon by type, title, one-line body, relative time, amber unread dot; tapping marks read and deep-links to the right screen. Empty state per filter.
- Namazi types & filters (Sab / Timing changes / Reminders): jamaat reminder, timing change in a favourite masjid, "masjid ne timings add kar di" (their request fulfilled), Eid date confirmed, Jumu'ah/special changes.
- Intezamia types & filters (Sab / Reminders / Reports): 1-day-before special reminder, "N namaziyon ne <prayer> ka waqt ghalat bataya" (grouped reports), new timing-board photo, timing requests, masjid approved/rejected.

### Empty states (no schedule)

- **Namazi · masjid detail with no daily timings:** the app shows **calculated prayer start times** from the AlAdhan API for that masjid's coordinates instead of an empty screen (section 6a). Header card: "Agli namaz · andaza — Asr · 4:20 PM · Waqt shuru · Jamaat confirm nahi" (dashed border). Schedule table titled "Aaj ke auqat" with an amber **"Andaza · location se"** badge, dashed border, single time column (no jamaat column), next prayer highlighted; a one-line note explains the method (Karachi, Hanafi Asr) and that actual jamaat is usually later. Below: compact card "Is masjid ki jamaat timings abhi add nahi hui" with **Darkhwast bhejein** and **Board ki photo**. Bottom bar: Directions + "Timings aane par batayein".
- **Map:** masjids without timings still show, with a grey pin labelled with the calculated next prayer prefixed by "~" (e.g. "~Asr 4:20"); in the nearby list they sort after masjids that have real timings, with an "Andaza" tag.
- Reminders are **not** offered on estimated times (only "Timings aane par batayein"), so nobody is told a jamaat time that the masjid never set.
- **Intezamia · Rozana empty** (possible if registration step 3 is skipped with "Baad mein add karein"): illustration, explanation, count of namazi requests, **"Timings add karein"** (pre-fills typical times and opens the edit sheet on Fajr), "Timing board ki photo se bharein". The Dashboard shows the same prompt at the top until daily timings exist.
- **Intezamia · Special empty:** "Koi special namaz schedule nahi", short explanation, quick-start chips **+ Jumu'ah / + Taraweeh / + Eid** that open the add sheet pre-filled, plus the normal "Special namaz add karein" button.
- Masjids with no daily timings can still be approved, but `getNextJamaat` returns `null` and every UI must handle that.

## 5. Realtime Database structure

RTDB is a JSON tree, so: **no arrays** (use maps keyed by id / push id), **timestamps are numbers** (ms, written with `serverTimestamp()`), and data that must be readable by different audiences lives in **separate top-level nodes** (rules cascade downwards and are not filters). Keep nodes flat and small — reading a node downloads everything under it.

All prayer times are `"HH:mm"` strings (24h) in the masjid's timezone (`timezone`, default `"Asia/Karachi"`).

```
/users/{uid}
    role: 'namazi' | 'intezamia'
    name?, email?
    language: 'en' | 'ur' | 'ur-Latn'
    reminderMinutes: 5 | 10 | 15 | 20
    defaultRadiusKm: number
    changeAlerts: boolean
    masjidId?: string                 // intezamia only (one masjid per account in MVP)
    roleInMasjid?: 'imam' | 'muazzin' | 'committee'
    createdAt: number

/favorites/{uid}/{masjidId}
    reminderOn: boolean
    createdAt: number

/masjids/{masjidId}                   // full masjid record; read one at a time, never listed
    name: { en, ur }                  // Roman Urdu UI uses en
    address: string
    lat: number, lng: number
    geohash: string                   // geofire-common, precision 10
    timezone: string
    status: 'pending' | 'approved' | 'rejected'
    ownerUid: string
    daily: { [entryId]: DailyEntry }          // keep active + future, prune older on save
    specials: { [specialId]: SpecialPrayer }
    timingsUpdatedAt: number
    createdAt: number

/geo/{masjidId}                       // public discovery index — ONLY approved masjids
    g: string                         // geohash (indexed)
    lat: number, lng: number
    hasTimings: boolean               // grey pin + "Andaza" when false

/masjidStats/{masjidId}               // public counters
    confirmations: number
    requests: number
    favourites: number

/confirmations/{masjidId}/{uid}       // one per user
    at: number
    timingsVersion: number            // timingsUpdatedAt they confirmed

/timingRequests/{masjidId}/{uid}      // namazi asks a masjid to add timings
    at: number
    notifyWhenAdded: boolean

/reports/{masjidId}/{pushId}          // wrong time / board photo
    uid: string
    prayer?: string, note?: string, photoUrl?: string
    at: number
```

```ts
type PrayerTime = { azaan: string; jamaat: string };
type DailyEntry = {
  effectiveFrom: number;   // ms
  times: { fajr: PrayerTime; zuhr: PrayerTime; asr: PrayerTime; maghrib: PrayerTime; isha: PrayerTime };
  createdBy: string;
};
type SpecialPrayer = {
  type: 'jumma' | 'taraweeh' | 'eid_ul_fitr' | 'eid_ul_adha' | 'custom';
  customName?: { en: string; ur: string };
  times: { [label in 'khutba' | 'jamaat' | 'first_jamaat' | 'second_jamaat' | 'start']?: string };
  repeat:
    | { kind: 'once'; date: string }                                        // 'YYYY-MM-DD'
    | { kind: 'daily'; from: string; until: string }
    | { kind: 'weekly'; weekday: 0|1|2|3|4|5|6; from: string; until?: string }; // 5 = Friday
  dateConfirmed: boolean;          // false for Eid until moon sighting
  remindManagement: boolean;       // remind intezamia 1 day before
  lastConfirmedFor?: string;       // 'YYYY-MM-DD'
  replacesPrayer?: 'zuhr' | 'isha';
  updatedAt: number;
};
```

Why this shape:
- Schedules live inside `/masjids/{id}` so the detail screen and "next jamaat" need **one read per masjid**.
- `/geo` is separate so the map can query it publicly without exposing pending masjids or owner data.
- Counters live in `/masjidStats` because RTDB has no count queries. Increment with a **multi-path update** that writes the per-user node and `increment(1)` together (rules in section 8 enforce one per user).
- Writes that touch several nodes (approve masjid → `/masjids/{id}/status` + `/geo/{id}`; confirm → `/confirmations/...` + `/masjidStats/...`) must be a single multi-path `update()` so they succeed or fail together.

---

## 6. Core logic (put in `src/lib/`, pure functions, unit-tested with Jest)

`resolveActiveSchedule(masjid, now)`
- Daily: active = entry with the latest `effectiveFrom <= now`; upcoming = entries with `effectiveFrom > now` (sorted).
- `specialsOn(date)` = specials whose repeat rule matches that date (`once`: same date; `daily`: from ≤ date ≤ until; `weekly`: weekday matches and from ≤ date ≤ (until ?? ∞)).
- Specials with `replacesPrayer` replace that daily row for the day (Jumu'ah replaces Zuhr on Friday). Others (Taraweeh, Eid, custom) are added as extra rows in time order.
- Unconfirmed Eid (`dateConfirmed: false`) is shown with an "expected" label, and no reminders are scheduled for it until confirmed.

`getNextJamaat(masjid, now)` → `{ prayer, time, minutesLeft }` including today's specials (rolls over to tomorrow's Fajr after the last one).

`distanceKm(a, b)` → use `geofire-common` `distanceBetween`.

`queryMasjidsInRadius(center, radiusKm)`
- `geohashQueryBounds(center, radiusM)` → for each `[start, end]`: `query(ref(db, 'geo'), orderByChild('g'), startAt(start), endAt(end))`.
- Merge results (dedupe by key), filter by true distance, sort by distance.
- Then fetch `/masjids/{id}` for the visible ones in parallel (`get`), cached per id in React Query; only fetch details for what is on screen / in the list.
- Requires `".indexOn": ["g"]` on `/geo` in the rules.
- Debounce slider changes (≈300 ms); cache keyed by rounded center + radius.

`findNearbyDuplicates(location)` → during registration, warn if an approved masjid exists within ~50 m (query `/geo`). Pending duplicates are not visible to clients; the admin checks them during approval.

### 6a. Calculated prayer times (fallback when a masjid has no timings)

- Source: **AlAdhan API** only (no local calculation library). Implement in `src/services/aladhan.ts`.
- Use the **monthly calendar endpoint by coordinates** (one call returns the whole month) rather than one call per day. Params: `latitude`, `longitude`, `method=1` (University of Islamic Sciences, Karachi), `school=1` (Hanafi Asr), and `timezonestring=Asia/Karachi` (or the masjid's timezone). The agent must confirm exact endpoint paths and response shape against the current AlAdhan docs before coding.
- **Cache aggressively:** key = coordinates rounded to 2 decimals (~1 km, nearby masjids share one result) + method + school + year-month. Store in AsyncStorage; keep the current and next month; refetch only when the month changes or settings change. React Query on top with `staleTime` = until end of month.
- Strip the timezone suffix AlAdhan adds to times (e.g. `"05:12 (PKT)"` → `"05:12"`) in one parser; validate with zod.
- Failure handling: on network error use the cached month if present; if nothing is cached, show "Andaze ke auqat abhi load nahi ho sake" with a retry button — never block the rest of the screen.
- Respect the API: debounce map moves, max one request per rounded coordinate per month, no requests for masjids that already have real timings.
- `getCalculatedTimes(location, date, settings)` reads from this cache/service and returns Fajr, Sunrise, Zuhr, Asr, Maghrib, Isha in the masjid timezone.
- Settings: Profile gets "Hisaab ka tareeqa" (Karachi default; also MWL, Umm al-Qura, ISNA) and "Asr" (Hanafi / Shafi). Store in settings; use the masjid's region default when the user hasn't chosen.
- `getNextJamaat` returns `{ source: 'masjid' | 'calculated', ... }` so every UI can label estimates. Unit-test the parser and cache logic with a saved AlAdhan response fixture (no live network calls in tests).
- Never write calculated times into the database as if they were masjid timings.

---

## 7. Auth

- On first launch, sign in **anonymously** (silent). Guest = anonymous user.
- When a guest registers (Apple / Google / email), **link** the credential to the anonymous user (`linkWithCredential`) so nothing is lost. If the account already exists, sign in instead and migrate any local favourites.
- Intezamia uses email + password (`createUserWithEmailAndPassword`), then in one multi-path update writes `/users/{uid}` (`role: 'intezamia'`, `masjidId`) and `/masjids/{newId}` with `status: 'pending'` (new id from `push()`).
- Forgot password: `sendPasswordResetEmail`.
- On iOS, if Google sign-in is offered, **Sign in with Apple must also be offered** (App Store guideline).
- Route guard in `app/index.tsx` and group layouts: intezamia → dashboard; registered/guest namazi → map; first launch → language/welcome.

---

## 8. Security rules (`database.rules.json` — draft, agent must test with the Firebase emulator)

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "role": { ".validate": "newData.val() === 'namazi' || newData.val() === 'intezamia'" }
      }
    },

    "favorites": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid && auth.provider !== 'anonymous'"
      }
    },

    "geo": {
      ".read": true,
      ".indexOn": ["g"],
      "$masjidId": {
        ".write": "auth != null && auth.token.admin === true",
        "hasTimings": {
          ".write": "auth != null && root.child('masjids/' + $masjidId + '/ownerUid').val() === auth.uid",
          ".validate": "newData.isBoolean()"
        }
      }
    },

    "masjids": {
      "$masjidId": {
        ".read": "data.child('status').val() === 'approved' || (auth != null && (data.child('ownerUid').val() === auth.uid || auth.token.admin === true))",
        ".write": "auth != null && (auth.token.admin === true || (!data.exists() && auth.provider !== 'anonymous' && newData.child('ownerUid').val() === auth.uid && newData.child('status').val() === 'pending') || (data.exists() && newData.exists() && data.child('ownerUid').val() === auth.uid && newData.child('ownerUid').val() === auth.uid && newData.child('status').val() === data.child('status').val() && newData.child('geohash').val() === data.child('geohash').val()))",
        ".validate": "newData.hasChildren(['name', 'lat', 'lng', 'geohash', 'status', 'ownerUid', 'timezone'])"
      }
    },

    "masjidStats": {
      "$masjidId": {
        ".read": true,
        "confirmations": {
          ".write": "auth != null && auth.provider !== 'anonymous' && !root.child('confirmations/' + $masjidId + '/' + auth.uid).exists() && newData.parent().parent().parent().child('confirmations/' + $masjidId + '/' + auth.uid).exists()",
          ".validate": "newData.isNumber() && newData.val() === (data.exists() ? data.val() : 0) + 1"
        },
        "requests": {
          ".write": "auth != null && !root.child('timingRequests/' + $masjidId + '/' + auth.uid).exists() && newData.parent().parent().parent().child('timingRequests/' + $masjidId + '/' + auth.uid).exists()",
          ".validate": "newData.isNumber() && newData.val() === (data.exists() ? data.val() : 0) + 1"
        },
        "favourites": {
          ".write": "auth != null && auth.provider !== 'anonymous'",
          ".validate": "newData.isNumber() && (newData.val() === (data.exists() ? data.val() : 0) + 1 || newData.val() === data.val() - 1)"
        }
      }
    },

    "confirmations": {
      "$masjidId": {
        "$uid": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid && auth.provider !== 'anonymous' && !data.exists() && root.child('masjids/' + $masjidId + '/status').val() === 'approved'"
        }
      }
    },

    "timingRequests": {
      "$masjidId": {
        ".read": "auth != null && (auth.token.admin === true || root.child('masjids/' + $masjidId + '/ownerUid').val() === auth.uid)",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && !data.exists()"
        }
      }
    },

    "reports": {
      "$masjidId": {
        ".read": "auth != null && (auth.token.admin === true || root.child('masjids/' + $masjidId + '/ownerUid').val() === auth.uid)",
        "$reportId": {
          ".write": "auth != null && !data.exists() && newData.child('uid').val() === auth.uid"
        }
      }
    }
  }
}
```

Notes for the agent:
- RTDB rules **cascade**: a `.read`/`.write` granted on a parent cannot be revoked by a child. That is why there is no `.read` on `/masjids` itself — clients can read one masjid by id but can never list the node. Discovery goes through `/geo`.
- Owner cannot change `status` or `geohash`/location after creation (moving a masjid needs admin re-approval).
- Counter rules assume `increment(1)` is resolved before rule evaluation and that the per-user node is written in the **same multi-path update** — verify both in the emulator; if not, fall back to `runTransaction` on the counter after writing the per-user node.
- Add `.validate` rules for time strings (`/^([01]\\d|2[0-3]):[0-5]\\d$/`) and string lengths during Phase 6.

**Admin approval (MVP):** set an `admin` custom claim on Ahsan's account with a one-off Admin SDK script (`scripts/set-admin.ts`, local only). Approve with `scripts/approve-masjid.ts <id>`, which in one multi-path update sets `/masjids/{id}/status = 'approved'` and writes `/geo/{id}` (`g`, `lat`, `lng`, `hasTimings`). Never approve by editing only `status` in the console, or the masjid won't appear on the map.

---

## 9. Design system

Tokens in `src/theme/tokens.ts`:

| Token | Value |
|---|---|
| `primary` (emerald) | `#0F5C4A` |
| `primarySoft` | `#E3EFEA` |
| `accent` (amber, "next jamaat") | `#B86B1E`, text `#8A4B0F`, bg `#FBEBD6` |
| `ink` | `#14201C` |
| `muted` | `#5B6660` |
| `surface` | `#FFFFFF` |
| `background` | `#F6F4EE` |
| `border` | `#E4E1D7` |
| `mapBase` | `#E8E4D8` |
| `danger` | `#B42318` |
| radii | buttons/inputs = full capsule (height/2), cards 26–28, sheets 34 |

Typography: Manrope 400–800 for Latin; Noto Nastaliq Urdu for Urdu with ~2× line height. Build a single `<AppText>` that picks font + line height from the current language.

**Glass:** build `<Glass>` in `src/components/Glass.tsx`:
- iOS: if `isLiquidGlassAvailable()` and reduce-transparency is off (`AccessibilityInfo.isReduceTransparencyEnabled`) → `GlassView`.
- Otherwise (Android, older iOS, reduce transparency): `BlurView` from `expo-blur` with a semi-opaque white tint, or a plain `rgba(255,255,255,0.85)` view.
- Use for: search bar, radius card, bottom sheet, tab bar, floating action bars, sign-in sheet.
- Text on glass must stay readable (WCAG AA) — glass tint ≥ 55% opacity.

Tab bars: use Expo Router native tabs if available for the SDK; otherwise custom floating glass tab bar as in mockups.

Touch targets ≥ 44 pt. Support Dynamic Type reasonably (no fixed-height text containers).

---

## 10. Internationalisation

- Locales: `en`, `ur`, `ur-Latn` (Roman Urdu). Files: `src/i18n/locales/{en,ur,ur-Latn}.json`.
- Default: device locale → `ur` if Urdu, else `ur-Latn` for Pakistan region, else `en`. User choice saved in settings + `users/{uid}.language`.
- Urdu = RTL: `I18nManager.allowRTL(true)` / `forceRTL(true)`, then reload with `expo-updates` `reloadAsync()` (show "app restart ho rahi hai").
- Use logical styles (`marginStart`, `paddingEnd`, `start/end`) — never hard-coded left/right. Flip directional icons (back arrow) in RTL.
- Prayer names translated in all 3 locales. Masjid names: `name.ur` for Urdu UI, `name.en` otherwise.
- Numerals: Urdu UI may show Urdu digits (۴:۴۵) — make it a single formatting helper.

---

## 11. Notifications (MVP: local only, no server)

- Reminder: for each favourite with `reminderOn`, schedule local notifications `reminderMinutes` before each jamaat for the next 7 days. Re-schedule on app open, on schedule change, and on settings change (cancel old ones by tag/identifier).
- Timing-change alerts: on app open, for favourites, if an **upcoming** schedule entry exists that the user hasn't seen, show an in-app banner and one local notification. Store seen versions locally.
- Real push (server-triggered) is **phase 2** — needs Cloud Functions (Blaze plan) + Expo push tokens.
- **Management reminder (intezamia):** for each special with `remindManagement`, schedule a local notification on the intezamia's device **1 day before each occurrence at 19:00 local time** (weekly: before every occurrence; daily range: only before the first day; once: before the date). Text: "Kal <name> hai — timings confirm karein ya badlein". Tapping opens the Dashboard card. Re-schedule on login, on app open and whenever specials change (cap at the next 30 days of occurrences). If they confirm, set `lastConfirmedFor` for that occurrence and hide the card.
- If an unconfirmed Eid (`dateConfirmed: false`) is approaching, the 1-day reminder also asks them to confirm the date after the moon announcement.
- Phase 2 (server): send the same reminder as push via a scheduled Cloud Function so it works even if the manager changes phone or never opens the app.
- **Notification inbox (MVP):** every local notification the app schedules or every alert it derives is also written to a local inbox (AsyncStorage, keyed per user, max 100 items, 30-day retention) so the list screen works offline and for guests. Intezamia items for reports / timing requests are derived live from `/reports/{masjidId}` and `/timingRequests/{masjidId}` (new since `lastSeenAt`). Unread state = `readAt` per item; badge = unread count.
- Phase 2: move the inbox to `/notifications/{uid}` written by Cloud Functions, so it syncs across devices.
- Ask notification permission only when the user first turns on a reminder (or when an intezamia saves their first special), not at launch.

---

## 12. Phases & acceptance criteria

**Phase 1 — Setup**
Expo + Router + TS strict, ESLint/Prettier, EAS dev build config, env vars, Firebase init (auth persistence), theme tokens, fonts, `<AppText>`, `<Glass>`, i18n skeleton with 3 locales.
✅ App boots on iOS + Android dev builds; language switch works incl. RTL reload.

**Phase 2 — Welcome, language, map (read-only, seeded data)**
Seed script (`scripts/seed.ts`, Admin SDK) creating ~15 approved test masjids around a configurable Karachi test coordinate — writes both `/masjids/{id}` and `/geo/{id}` (a few with `hasTimings: false`). Map with location permission flow (graceful if denied: manual search/area), radius slider, pins, clustering, nearby sheet.
✅ Changing radius updates circle, pins and list; only approved masjids appear.

**Phase 3 — Masjid detail + schedule logic**
`resolveActiveSchedule`, `specialsOn`, `getNextJamaat` with Jest tests (Friday Jumu'ah replacing Zuhr, Taraweeh only inside its date range, once-only Eid, weekly with and without end date, unconfirmed Eid, after-Isha rollover, future effective date). Detail screen, Directions deep link.
✅ Tests pass; detail matches mockup.

**Phase 4 — Namazi auth + favourites + reminders**
Anonymous auth, sign-in sheet, Apple/Google/email, account linking, favourites, profile settings, local reminders, confirm-timing, report-timing.
✅ Guest → register keeps state; reminders fire at the right time; guest cannot write favourites (rules).

**Phase 5 — Intezamia**
Login, 3-step registration (zod validation, duplicate-nearby warning, draggable pin), pending state, dashboard, schedule editor (Rozana with effective dates; Special with once / daily / weekly repeat and date ranges, 1-day-before management reminder + Dashboard "Kal" card), pruning old daily entries and expired one-off specials.
✅ New masjid is invisible on map until status = approved; owner can edit only own masjid.

**Phase 6 — Rules, indexes, hardening**
RTDB security rules + emulator tests (`@firebase/rules-unit-testing`), `.indexOn` checks, error/empty/offline states, loading skeletons, accessibility pass.
✅ Rules tests pass; app usable with location denied and with no network (cached data).

**Phase 7 — Release prep**
App icons/splash, store listing text in EN + UR, privacy policy (location use), EAS build + submit config.
✅ Internal test builds on TestFlight and Play internal testing.

---

## 13. Out of scope for MVP (later)

- Timing-board photo → OCR auto-fill (button can exist but show "coming soon")
- Server push notifications, admin web panel
- Donations / payments for masjids
- Announcements, janaza alerts
- Multiple masjids per intezamia account, multiple managers per masjid

---

## 14. Folder structure

```
app/                     # routes (section 3)
src/
  components/            # Glass, AppText, Button, Input, Switch, Pill, MasjidCard, PrayerTable, RadiusSlider, SignInSheet
  features/
    map/ masjid/ auth/ favourites/ intezamia/ settings/
  lib/                   # schedule.ts, geo.ts, time.ts (pure + tested)
  services/firebase/     # app.ts, auth.ts, db.ts (paths + typed helpers), masjids.ts, geo.ts, users.ts, favorites.ts, stats.ts
  i18n/                  # index.ts, locales/
  theme/                 # tokens.ts, typography.ts
  store/                 # settings (zustand)
scripts/                 # seed.ts, set-admin.ts, approve-masjid.ts (local only)
database.rules.json
```
