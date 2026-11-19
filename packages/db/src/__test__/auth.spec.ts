import type { CatalogItem, Rating } from '@xd-memories/domain';
import type { Mail } from '@xd-memories/mail';
import { getMigrations } from 'better-auth/db/migration';
import { type Kysely, sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteAccount } from '../account';
import { authOptions, createAuth } from '../auth';
import { highlight, logEntry, rate, reachSeason } from '../library';
import { migrateToLatest } from '../migrate';
import { withUser } from '../rls';
import { saveWork } from '../work-cache';
import { startPostgres, type TestDatabase } from './postgres';

let database: TestDatabase;
let db: Kysely<unknown>;

// Every mail auth sends, kept here instead of delivered (smtpMailer has its own tests).
const outbox: Mail[] = [];

const settings = () => ({
  db,
  secret: 'test-secret-that-is-at-least-32-characters',
  baseURL: 'http://localhost:3000',
  mailer: { send: async (mail: Mail) => void outbox.push(mail) },
});

const mailsTo = (email: string) => outbox.filter(({ to }) => to === email);

// The link in the latest mail to this address.
const linkMailedTo = (email: string) => {
  const link = mailsTo(email)
    .at(-1)
    ?.text.match(/https?:\/\/\S+/)?.[0];
  if (link === undefined) throw new Error(`no link mailed to ${email}`);
  return link;
};

const PASSWORD = 'correct horse battery';

const signUp = (email: string, password = PASSWORD) =>
  createAuth(settings()).api.signUpEmail({ body: { email, password, name: 'Ada' } });

const signIn = (email: string, password = PASSWORD) =>
  createAuth(settings()).api.signInEmail({ body: { email, password } });

// What a click on the link does: Better Auth handles it and redirects.
const follow = (link: string) => createAuth(settings()).handler(new Request(link));

const signUpConfirmed = async (email: string) => {
  await signUp(email);
  await follow(linkMailedTo(email));
};

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

it('the host app can add plugins, such as Next.js cookie handling', () => {
  const plugin = { id: 'host-plugin' };

  const options = authOptions({ ...settings(), plugins: [plugin] });

  expect(options.plugins).toEqual([plugin]);
});

describe('email + password', () => {
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
    await signUpConfirmed('session@example.com');

    const session = await signIn('session@example.com');

    expect(session.token).toEqual(expect.any(String));
  });

  it('signing in with a wrong password is refused', async () => {
    await signUpConfirmed('wrong@example.com');

    const act = () => signIn('wrong@example.com', 'not the password');

    await expect(act()).rejects.toThrow(/invalid email or password/i);
  });
});

describe('email verification', () => {
  it('signing up starts no session', async () => {
    const signedUp = await signUp('pending@example.com');

    expect(signedUp.token).toBeNull();
  });

  it('signing up mails a link to confirm the address', async () => {
    await signUp('confirm@example.com');

    const [mail] = mailsTo('confirm@example.com');

    expect(mail?.subject).toBe('Confirm your email for xd-memories');
    expect(linkMailedTo('confirm@example.com')).toMatch(
      /^http:\/\/localhost:3000\/api\/auth\/verify-email\?token=/,
    );
  });

  // Anyone can type any address into sign-up, so the mail carries nothing they typed.
  it('the mail carries nothing the sign-up form sent but the address', async () => {
    await createAuth(settings()).api.signUpEmail({
      body: { email: 'name@example.com', password: PASSWORD, name: 'Visit evil.example' },
    });

    const [mail] = mailsTo('name@example.com');

    expect(mail?.text).not.toContain('evil.example');
  });

  it('signing in before confirming is refused', async () => {
    await signUp('early@example.com');

    const act = () => signIn('early@example.com');

    await expect(act()).rejects.toThrow(/email not verified/i);
  });

  it('signing in before confirming mails a new link', async () => {
    await signUp('again@example.com');
    await signIn('again@example.com').catch(() => undefined);

    const mails = mailsTo('again@example.com');

    expect(mails).toHaveLength(2);
  });

  it('following the link signs you in', async () => {
    await signUp('link@example.com');

    const response = await follow(linkMailedTo('link@example.com'));

    expect(response.headers.get('set-cookie')).toMatch(/session_token=/);
  });

  it('after following the link, signing in works', async () => {
    await signUpConfirmed('confirmed@example.com');

    const session = await signIn('confirmed@example.com');

    expect(session.token).toEqual(expect.any(String));
  });

  it('signing up with a taken address answers the same and creates no second account', async () => {
    await signUp('taken@example.com');

    const second = await signUp('taken@example.com', 'another password');
    const { rows } = await sql`select id from users where email = 'taken@example.com'`.execute(db);

    expect(second.token).toBeNull();
    expect(rows).toHaveLength(1);
  });
});

describe('password reset', () => {
  const requestReset = (email: string) =>
    createAuth(settings()).api.requestPasswordReset({
      body: { email, redirectTo: '/reset-password' },
    });

  // The mailed link checks the token, then redirects to the app's reset page with it.
  const tokenMailedTo = async (email: string) => {
    const response = await follow(linkMailedTo(email));
    const token = new URL(
      response.headers.get('location') ?? '',
      'http://localhost:3000',
    ).searchParams.get('token');
    if (token === null) throw new Error(`no reset token for ${email}`);
    return token;
  };

  const resetPassword = async (token: string, newPassword = 'a brand new password') =>
    createAuth(settings()).api.resetPassword({ body: { token, newPassword } });

  it('asking for a reset mails a link that leads to the reset page', async () => {
    await signUpConfirmed('forgot@example.com');
    await requestReset('forgot@example.com');

    const response = await follow(linkMailedTo('forgot@example.com'));

    expect(mailsTo('forgot@example.com').at(-1)?.subject).toBe('Reset your xd-memories password');
    expect(response.headers.get('location')).toMatch(
      /^http:\/\/localhost:3000\/reset-password\?token=/,
    );
  });

  it('an unknown address gets the same answer, and no mail', async () => {
    const answer = await requestReset('nobody@example.com');

    expect(answer.status).toBe(true);
    expect(mailsTo('nobody@example.com')).toEqual([]);
  });

  it('the new password works', async () => {
    await signUpConfirmed('new@example.com');
    await requestReset('new@example.com');
    await resetPassword(await tokenMailedTo('new@example.com'));

    const session = await signIn('new@example.com', 'a brand new password');

    expect(session.token).toEqual(expect.any(String));
  });

  it('the old password stops working', async () => {
    await signUpConfirmed('old@example.com');
    await requestReset('old@example.com');
    await resetPassword(await tokenMailedTo('old@example.com'));

    const act = () => signIn('old@example.com');

    await expect(act()).rejects.toThrow(/invalid email or password/i);
  });

  it('a link works once', async () => {
    await signUpConfirmed('once@example.com');
    await requestReset('once@example.com');
    const token = await tokenMailedTo('once@example.com');
    await resetPassword(token);

    const act = () => resetPassword(token, 'yet another password');

    await expect(act()).rejects.toThrow(/invalid token/i);
  });

  // Whoever had the old password, such as on a lost laptop, is signed out.
  it('resetting ends every session of the account', async () => {
    await signUpConfirmed('sessions@example.com');
    await signIn('sessions@example.com');
    await requestReset('sessions@example.com');
    await resetPassword(await tokenMailedTo('sessions@example.com'));

    const { rows } = await sql`
      select s.id from sessions s join users u on u.id = s.user_id
      where u.email = 'sessions@example.com'`.execute(db);

    expect(rows).toEqual([]);
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

// The app uses sign-up, sign-in, sign-out, the session, email verification and password reset.
// Every other endpoint that changes an account or lists sessions is off: on the shared demo
// account, one visitor could otherwise rename it, list other visitors' sessions or end them.
describe('auth endpoints the app does not use are off', () => {
  it.each([
    '/update-user',
    '/change-email',
    '/change-password',
    '/delete-user',
    '/delete-user/callback',
    '/list-sessions',
    '/revoke-session',
    '/revoke-sessions',
    '/revoke-other-sessions',
    '/update-session',
    '/list-accounts',
    '/account-info',
    '/link-social',
    '/unlink-account',
    '/get-access-token',
    '/refresh-token',
  ])('%s is not found, by GET or POST', async (path) => {
    const auth = createAuth(settings());

    const statuses = await Promise.all(
      ['GET', 'POST'].map(async (method) => {
        const request = new Request(`http://localhost:3000/api/auth${path}`, { method });
        return (await auth.handler(request)).status;
      }),
    );

    expect(statuses).toEqual([404, 404]);
  });

  it('a session can still be read', async () => {
    const response = await createAuth(settings()).handler(
      new Request('http://localhost:3000/api/auth/get-session'),
    );

    expect(response.status).toBe(200);
  });
});

describe('deleting an account', () => {
  // What the browser sends once signed in: the session cookie.
  const signedIn = async (email: string) => {
    const { headers } = await createAuth(settings()).api.signInEmail({
      body: { email, password: PASSWORD },
      returnHeaders: true,
    });
    const cookie = headers
      .getSetCookie()
      .map((setCookie) => setCookie.split(';')[0])
      .join('; ');
    return new Headers({ cookie });
  };

  const idOf = async (email: string) => {
    const { rows } = await sql<{ id: string }>`
      select id from users where email = ${email}`.execute(db);
    const [row] = rows;
    if (row === undefined) throw new Error(`no user ${email}`);
    return row.id;
  };

  const dune = (externalId: string): CatalogItem => ({
    ref: { source: 'openlibrary', externalId },
    mediaType: 'book',
    title: 'Dune',
    creators: ['Frank Herbert'],
    year: 1965,
    cover: null,
    sourceVersion: 'search.json',
    raw: {},
  });

  const severance = (externalId: string): CatalogItem => ({
    ref: { source: 'tmdb', externalId },
    mediaType: 'series',
    title: 'Severance',
    creators: [],
    year: 2022,
    cover: null,
    sourceVersion: '3/search/tv',
    raw: {},
  });

  // A library with something in every user-owned table, and a reset link waiting.
  const withLibrary = async (email: string, externalId: string) => {
    await signUpConfirmed(email);
    const userId = await idOf(email);
    const workId = await withUser(db, userId, async (trx) => {
      const id = await saveWork(trx, dune(externalId));
      await logEntry(trx, { workId: id, status: 'doing', at: new Date() });
      await rate(trx, { workId: id, rating: 90 as Rating });
      const series = await saveWork(trx, severance(`${externalId}-tv`));
      await logEntry(trx, { workId: series, status: 'doing', at: new Date() });
      await reachSeason(trx, { workId: series, season: 2 });
      await highlight(trx, id);
      return id;
    });
    await createAuth(settings()).api.requestPasswordReset({
      body: { email, redirectTo: '/reset-password' },
    });
    return { userId, workId };
  };

  const deleting = async (email: string, password: string) =>
    deleteAccount(createAuth(settings()), { headers: await signedIn(email), password });

  const USER_TABLES = [
    ['users', 'id'],
    ['sessions', 'user_id'],
    ['accounts', 'user_id'],
    ['verifications', 'value'],
    ['entries', 'user_id'],
    ['ratings', 'user_id'],
    ['progress', 'user_id'],
    ['highlights', 'user_id'],
    ['read_only_users', 'user_id'],
  ] as const;

  const rowsNaming = async (userId: string) =>
    Object.fromEntries(
      await Promise.all(
        USER_TABLES.map(async ([table, column]) => {
          const { rows } = await sql`
            select from ${sql.table(table)} where ${sql.ref(column)} = ${userId}`.execute(db);
          return [table, rows.length] as const;
        }),
      ),
    );

  it('after deleteAccount, no row of any user-owned table names the user', async () => {
    const { userId } = await withLibrary('gone@example.com', 'works/OL900W');
    await deleting('gone@example.com', PASSWORD);

    const rows = await rowsNaming(userId);

    expect(rows).toEqual(Object.fromEntries(USER_TABLES.map(([table]) => [table, 0])));
  });

  it('reports the account deleted', async () => {
    await withLibrary('done@example.com', 'works/OL901W');

    const result = await deleting('done@example.com', PASSWORD);

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('keeps the shared work, its source and others’ entries for it', async () => {
    const { workId } = await withLibrary('leaver@example.com', 'works/OL902W');
    await withLibrary('stayer@example.com', 'works/OL902W');
    await deleting('leaver@example.com', PASSWORD);

    const { rows } = await sql`
      select
        (select count(*)::int from works where id = ${workId}) as works,
        (select count(*)::int from external_refs where work_id = ${workId}) as refs,
        (select count(*)::int from entries where work_id = ${workId}) as entries`.execute(db);

    expect(rows).toEqual([{ works: 1, refs: 1, entries: 1 }]);
  });

  it('signing in afterwards fails', async () => {
    await withLibrary('after@example.com', 'works/OL903W');
    await deleting('after@example.com', PASSWORD);

    const act = () => signIn('after@example.com');

    await expect(act()).rejects.toThrow(/invalid email or password/i);
  });

  it.each`
    password             | case
    ${'not my password'} | ${'a wrong password'}
    ${''}                | ${'no password, even from a session just started'}
  `('with $case, nothing is deleted', async ({ password }) => {
    const { userId } = await withLibrary(`kept-${password.length}@example.com`, 'works/OL904W');

    const result = await deleting(`kept-${password.length}@example.com`, password);

    expect(result).toEqual({ ok: false, error: { kind: 'WrongPassword' } });
    expect((await rowsNaming(userId)).users).toBe(1);
  });

  it('a read-only account, such as the demo, is not deleted', async () => {
    const { userId } = await withLibrary('readonly@example.com', 'works/OL905W');
    await sql`insert into read_only_users (user_id) values (${userId})`.execute(db);

    const result = await deleting('readonly@example.com', PASSWORD);

    expect(result).toEqual({ ok: false, error: { kind: 'ReadOnly' } });
    expect((await rowsNaming(userId)).users).toBe(1);
  });
});
