import { connect, demoPassword, seedDemo } from '../src';

// pnpm --filter @xd-memories/db seed-demo — creates or resets the read-only demo account on
// DATABASE_URL. Its password derives from BETTER_AUTH_SECRET, so use the secret the app runs with.
const url = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;
if (!url || !secret) {
  console.error('DATABASE_URL and BETTER_AUTH_SECRET must be set (see .env.example).');
  process.exit(1);
}

const db = connect(url);
try {
  await seedDemo(db, { password: demoPassword(secret) });
  console.log('Demo account ready.');
} finally {
  await db.destroy();
}
