import { connect, migrateToLatest } from '../src';

// pnpm --filter @xd-memories/db migrate — brings DATABASE_URL up to the latest migration.
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (see .env.example).');
  process.exit(1);
}

const db = connect(url);
try {
  const applied = await migrateToLatest(db);
  console.log(applied.length === 0 ? 'Already up to date.' : `Applied: ${applied.join(', ')}`);
} finally {
  await db.destroy();
}
