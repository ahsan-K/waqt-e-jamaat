# Firebase console setup — Waqt-e-Jamaat

Ye steps tum khud Firebase console par karoge. CLI Phase 1 se 3 tak emulator par kaam kar sakti hai, lekin **Phase 4 (login) se pehle** ye setup mukammal hona chahiye. Console ke menus waqt ke saath badalte rehte hain, agar koi option naam se na mile to search bar use karna.

Pehle ek **bundle ID / package name** final kar lo, kyunki ye baad mein badalna mushkil hai. Maslan: `com.ahsan.waqtejamaat` (iOS aur Android dono ke liye same).

---

## 1. Project banao
1. https://console.firebase.google.com par **Add project** → naam `waqt-e-jamaat`.
2. Google Analytics: MVP ke liye band bhi rakh sakte ho.
3. Plan: shuru mein **Spark (free)** kaafi hai. Cloud Functions (server push, Phase 2) ke liye baad mein **Blaze** chahiye hoga — tab Google Cloud Billing mein **budget alert** (maslan $5) zaroor lagana.

## 2. Realtime Database
1. Build → **Realtime Database** → Create database.
2. Location: **Singapore (asia-southeast1)** — Pakistan ke sab se qareeb option. Ye baad mein nahi badalta.
3. Security: **Locked mode** se shuru karo. Asli rules hum CLI wali `database.rules.json` se deploy karenge (step 7).
4. Database ka URL copy kar lo (`https://…firebasedatabase.app`).

## 3. Apps register karo
Project settings (gear icon) → General → **Your apps**:
1. **Web app** add karo (naam: `waqt-e-jamaat-expo`). Hosting ki zaroorat nahi. Jo `firebaseConfig` milega, wohi Expo app use karegi.
2. **iOS app** add karo, bundle ID wahi jo upar final kiya. `GoogleService-Info.plist` download kar lo.
3. **Android app** add karo, package name wahi. `google-services.json` download kar lo. SHA-1 abhi khaali chhor do (step 5 mein).

> Ye dono files repo mein commit karni hain ya nahi, CLI se poochh lena; inme koi password nahi hota lekin aam taur par `.gitignore` mein rakh kar EAS secrets se dete hain.

## 4. Authentication
Build → **Authentication** → Get started → **Sign-in method**, ye chaar enable karo:
1. **Anonymous** (guest namazi).
2. **Email/Password** (intezamia aur namazi). "Email link" wala option band rehne do.
3. **Google** — project support email select karo. Enable karne ke baad yahan se **Web client ID** copy kar lo.
4. **Apple** — enable karo. iPhone par native Apple login ke liye aam taur par sirf ye kaafi hai; saath mein Apple Developer account mein (step 6) capability on karni hogi.

Templates tab mein **password reset email** ka text aur sender naam "Waqt-e-Jamaat" kar do.

## 5. Android SHA-1 (Google login ke liye zaroori)
Google login Android par tab hi chalega jab app ki signing SHA-1 Firebase mein ho:
1. CLI ke saath EAS setup ke baad `eas credentials` chala kar Android keystore ka **SHA-1** (aur SHA-256) nikalo.
2. Project settings → Android app → **Add fingerprint** → paste.
3. Play Store par upload ke baad Play Console → App integrity → **App signing key** ka SHA-1 bhi yahan add karna, warna live app mein Google login fail hoga.
4. SHA add karne ke baad naya `google-services.json` download kar ke purana replace karo.

## 6. Apple Developer (iOS)
1. developer.apple.com → Certificates, IDs & Profiles → **Identifiers** → apni app ID → **Sign in with Apple** capability on.
2. App Store Connect mein app abhi banane ki zaroorat nahi; TestFlight (Phase 7) se pehle bana lena.

## 7. Rules deploy karna (terminal se)
```bash
npm install -g firebase-tools
firebase login
firebase use --add            # apna waqt-e-jamaat project chuno
firebase deploy --only database
```
Pehle CLI se kehna ke `firebase.json` mein `database.rules.json` ka path set kare. **Har dafa rules badlein to dobara deploy** karna. Console ke Rules tab mein haath se edit mat karna, warna repo aur console alag ho jayenge.

## 8. Admin (masjid approve karne ke liye)
1. Project settings → **Service accounts** → Generate new private key → JSON download.
2. Is file ko **repo se bahar** rakho (maslan `~/keys/waqt-admin.json`). Ye poore database ki chaabi hai — kabhi commit ya share mat karna.
3. App mein apna account bana lo, phir Authentication → Users se apna **UID** copy karo.
4. Terminal:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/keys/waqt-admin.json
npx tsx scripts/set-admin.ts <tumhara-uid>
```
5. App se logout/login karo taake admin claim lag jaye. Masjid approve: `npx tsx scripts/approve-masjid.ts <masjidId>`.

## 9. Google Maps key (sirf Android)
iOS par Apple Maps chalta hai, Android ke liye Google Maps key chahiye:
1. https://console.cloud.google.com (wahi project select karo) → APIs & Services → **Maps SDK for Android** enable.
2. Credentials → Create API key → **Restrict**: Android apps → package name + SHA-1, aur API restriction sirf Maps SDK for Android.
3. Maps SDK ka free quota mobile apps ke liye kaafi hota hai, lekin billing account link karna parta hai — budget alert laga dena.

## 10. CLI ko ye values dena (`.env`)
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=      # GoogleService-Info.plist ka CLIENT_ID
GOOGLE_MAPS_ANDROID_API_KEY=
```
Plus `GoogleService-Info.plist` aur `google-services.json`. CLI ka `.env.example` final list batayega; agar usme kuch alag ho to uski list follow karna.

## 11. Baad mein (Phase 2 / launch se pehle)
- **Storage** — jab "board ki photo" feature banega.
- **App Check** — taake sirf tumhari asli app database use kar sake.
- **Blaze + Cloud Functions** — server push notifications aur inbox sync.
- **Backups** — RTDB automated backups Blaze par milte hain; launch ke baad on kar dena.
- Usage tab par nazar rakhna: RTDB mein bill **download hone wale data** par banta hai, isi liye plan mein nodes chhote aur cache zyada rakha hai.

---

### Checklist
- [ ] Project bana, bundle ID final
- [ ] Realtime Database (Singapore), URL copy
- [ ] Web + iOS + Android apps, config files download
- [ ] Auth: Anonymous, Email/Password, Google, Apple
- [ ] Android SHA-1 (debug/EAS + Play signing)
- [ ] Apple: Sign in with Apple capability
- [ ] Rules deploy (`firebase deploy --only database`)
- [ ] Admin claim apne account par
- [ ] Android Maps key restricted
- [ ] `.env` CLI ko diya
