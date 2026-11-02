import { getMigrations } from 'better-auth/db/migration';
import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authOptions, createAuth } from '../auth';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

const settings = () => ({
  db,
  secret: 'test-secret-that-is-at-least-32-characters',
  baseURL: 'http://localhost:3000',
});

beforeAll(async () => {
  database = await startPostgres();
  db = database.db;
  await migrateToLatest(db);
});

// If the container never started, there is nothing to stop; let the real start-up error speak.
afterAll(async () => {
  await database?.stop();
});

describe('0003-auth matches what Better Auth expects', () => {
  // Better Auth compares the live database with its own schema. After a Better Auth upgrade that
  // needs new tables or columns, these fail here instead of in production.
  it.each(['toBeCreated', 'toBeAdded', 'unsafeChanges', 'schemaProblems'] as const)(
    'nothing in %s',
    async (key) => {
      const plan = await getMigrations(authOptions(settings()));

      expect(plan[key]).toEqual([]);
    },
  );
});

describe('email + password', () => {
  const signUp = (email: string, password = 'correct horse battery') =>
    createAuth(settings()).api.signUpEmail({ body: { email, password, name: 'Ada' } });

  it('signing up creates a user', async () => {
    await signUp('ada@example.com');

    const { rows } = await sql<{ email: string }>`select email from users`.execute(db);

    expect(rows).toEqual([{ email: 'ada@example.com' }]);
  });

  it('the password is stored hashed, never as typed', async () => {
    await signUp('hash@example.com', 'correct horse battery');

    const { rows } = await sql<{ password: string }>`
      select a.password from accounts a join users u on u.id = a.user_id
      where u.email = 'hash@example.com'`.execute(db);

    expect(rows[0]?.password).not.toContain('correct horse battery');
  });

  it('signing in with the right password starts a session', async () => {
    await signUp('session@example.com');

    const session = await createAuth(settings()).api.signInEmail({
      body: { email: 'session@example.com', password: 'correct horse battery' },
    });

    expect(session.token).toEqual(expect.any(String));
  });

  it('signing in with a wrong password is refused', async () => {
    await signUp('wrong@example.com');

    const act = () =>
      createAuth(settings()).api.signInEmail({
        body: { email: 'wrong@example.com', password: 'not the password' },
      });

    await expect(act()).rejects.toThrow(/invalid email or password/i);
  });
});

describe('request code can never read auth data', () => {
  it.each(['users', 'sessions', 'accounts', 'verifications'])(
    'app_user cannot read %s',
    async (table) => {
      const act = () =>
        withUser(db, 'alice', (trx) => sql`select * from ${sql.table(table)}`.execute(trx));

      await expect(act()).rejects.toThrow(/permission denied/);
    },
  );
});
