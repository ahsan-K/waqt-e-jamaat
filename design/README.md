# Design reference — Waqt-e-Jamaat

These HTML files are the **approved mockups** (390 × 844 phone frames). They are the visual source of truth: match layout, spacing, colours, radii, copy (Roman Urdu text) and states. Open them in a text editor — read the inline `style="…"` attributes for exact values and the `<script>` at the bottom of each file for the interactive states and sample data.

They were authored for a design-canvas runtime (`support.js`, not included), so they will **not** render correctly by opening in a browser. Links between screens use the original `*.dc.html` names — map them with the table below. Sample names/times are placeholders; `[Area]`, `[N]`, `[Aapka naam]` etc. are slots for real data.

| Mockup file | Route / component | Notes |
|---|---|---|
| Splash.html | native splash + `app/_layout.tsx` JS splash | logo, name, Urdu name, 3-dot loader |
| Welcome.html | `app/welcome.tsx` | Namazi / Intezamia glass cards, language pill |
| Language.html | `app/language.tsx` | live preview; Urdu = RTL + Nastaliq |
| Main.html | `app/(namazi)/map.tsx` | radius slider, pins, nearby sheet, bell, glass tab bar |
| Detail.html | `app/masjid/[id].tsx` | next-jamaat card, schedule, confirm, sign-in sheet for guests |
| DetailEmpty.html | `app/masjid/[id].tsx` (no timings) | AlAdhan estimated times, "Andaza" badge, request card |
| NamaziAuth.html | `app/auth/namazi.tsx` | Register/Login tabs, Apple, Google, email |
| Favourites.html | `app/(namazi)/favourites.tsx` | per-masjid reminder switch, upcoming-change note |
| Profile.html | `app/(namazi)/profile.tsx` | reminder minutes, radius, alerts, language, logout |
| Notifications.html | `app/notifications.tsx` (namazi) | filters, grouped list, unread dots |
| Login.html | `app/(intezamia)/login.tsx` | email + password |
| Register.html | `app/(intezamia)/register/*` | 3-step wizard + submitted state |
| Dashboard.html | `app/(intezamia)/dashboard.tsx` | status badge, "Kal: …" reminder card, today's timings, bell |
| Schedule.html | `app/(intezamia)/schedule.tsx` — Rozana tab | tap row → edit sheet |
| ScheduleDailyEdit.html | Rozana edit sheet (open) | −/+ steppers, Foran / Kal se / Tareekh se, notify switch |
| ScheduleSpecial.html | Special tab | cards with repeat + range chips, pencil edit |
| ScheduleSpecialAdd.html | Special add sheet (open) | type, times, repeat, weekday, dates, 1-day reminder |
| ScheduleEmpty.html | Rozana empty state | |
| ScheduleSpecialEmpty.html | Special empty state | quick-start chips |
| NotificationsIntezamia.html | `app/notifications.tsx` (intezamia) | reminders / reports filters |

Glass surfaces in the mockups use `backdrop-filter`; in the app use the `<Glass>` component from PLAN.md §9 (GlassView on iOS, blur/translucent fallback on Android).
