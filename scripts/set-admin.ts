/** Usage: npx tsx scripts/set-admin.ts <uid>  — grants the `admin` custom claim. */
import { adminAuth } from './lib/admin';

async function main() {
  const uid = process.argv[2];
  if (!uid) throw new Error('Usage: npx tsx scripts/set-admin.ts <uid>');
  await adminAuth.setCustomUserClaims(uid, { admin: true });
  console.log(`admin claim set for ${uid}. Sign out and back in to refresh the token.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
