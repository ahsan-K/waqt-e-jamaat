// Creates an email/password user in the Auth emulator (demo project) and exposes it to the flow.
const email = 'e2e' + Date.now() + '@example.com';
const res = http.post(
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
  {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      password: 'secret123',
      displayName: 'Test Namazi',
      returnSecureToken: true,
    }),
  },
);
if (res.status !== 200) throw new Error('signUp failed: ' + res.status + ' ' + res.body);
output.email = email;
