// Creates an intezamia user + an approved masjid it owns, directly in the emulators
// (Auth REST signUp; RTDB REST with the emulator's "owner" token, which bypasses rules).
const email = 'iz' + Date.now() + '@example.com';
const res = http.post(
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
  {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      password: 'secret123',
      displayName: 'Imam Sahib',
      returnSecureToken: true,
    }),
  },
);
if (res.status !== 200) throw new Error('signUp failed: ' + res.status);
const uid = json(res.body).localId;
const id = 'e2e-' + Date.now();
const now = Date.now();
// Tomorrow in Asia/Karachi (UTC+5, no DST) as YYYY-MM-DD.
const k = new Date(now + 5 * 3600 * 1000 + 24 * 3600 * 1000);
const tomorrow = k.toISOString().slice(0, 10);
const times = {
  fajr: { azaan: '05:10', jamaat: '05:40' },
  zuhr: { azaan: '12:45', jamaat: '13:30' },
  asr: { azaan: '16:30', jamaat: '16:45' },
  maghrib: { azaan: '18:04', jamaat: '18:09' },
  isha: { azaan: '19:30', jamaat: '20:00' },
};
const data = {};
data['users/' + uid] = {
  role: 'intezamia',
  name: 'Imam Sahib',
  email: email,
  masjidId: id,
  roleInMasjid: 'imam',
  createdAt: now,
};
data['masjids/' + id] = {
  name: { en: 'Masjid-e-Test', ur: 'مسجدِ ٹیسٹ' },
  address: 'Block 9, Karachi',
  lat: 24.8707,
  lng: 67.0111,
  geohash: 'tkrsvgd5qx',
  timezone: 'Asia/Karachi',
  status: 'approved',
  ownerUid: uid,
  createdAt: now,
  timingsUpdatedAt: now,
  daily: { d1: { effectiveFrom: now - 864e5, times: times, createdBy: uid } },
  specials: {
    eid: {
      type: 'eid_ul_adha',
      times: { first_jamaat: '06:45', second_jamaat: '07:45' },
      repeat: { kind: 'once', date: tomorrow },
      dateConfirmed: true,
      remindManagement: true,
      updatedAt: now,
    },
  },
};
data['geo/' + id] = { g: 'tkrsvgd5qx', lat: 24.8707, lng: 67.0111, hasTimings: true };
const w = http.request('http://127.0.0.1:9000/.json?ns=demo-waqt-e-jamaat-default-rtdb', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
  body: JSON.stringify(data),
});
if (w.status !== 200) throw new Error('rtdb write failed: ' + w.status + ' ' + w.body);
output.email = email;
output.masjidId = id;
