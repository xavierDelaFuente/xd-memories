import { describe, expect, it } from 'vitest';
import { assertProductionConfig, productionConfigProblems } from '../production-config';

// Made-up values: each test needs only something set, or something wrong.
const COMPLETE = {
  VERCEL_ENV: 'production',
  DATABASE_URL: 'postgres://user:db-password@db.example/xd',
  BETTER_AUTH_SECRET: 'a-secret-that-is-at-least-32-characters',
  BETTER_AUTH_URL: 'https://xd.example',
  TMDB_API_TOKEN: 'tmdb-token',
  MUSICBRAINZ_USER_AGENT: 'xd-memories/1.0 (https://xd.example)',
  SMTP_URL: 'smtps://user:mail-password@smtp.example:465',
  MAIL_FROM: 'xd-memories <xd@example.com>',
};

describe('productionConfigProblems', () => {
  it('finds none in a complete production config', () => {
    const problems = productionConfigProblems(COMPLETE);

    expect(problems).toEqual([]);
  });

  it.each`
    name
    ${'DATABASE_URL'}
    ${'BETTER_AUTH_SECRET'}
    ${'BETTER_AUTH_URL'}
    ${'TMDB_API_TOKEN'}
    ${'MUSICBRAINZ_USER_AGENT'}
    ${'SMTP_URL'}
    ${'MAIL_FROM'}
  `('names $name when it is missing or empty', ({ name }: { name: string }) => {
    const missing = productionConfigProblems({ ...COMPLETE, [name]: undefined });
    const empty = productionConfigProblems({ ...COMPLETE, [name]: '' });

    expect(missing).toEqual([`${name} is not set`]);
    expect(empty).toEqual([`${name} is not set`]);
  });

  // Session cookies are only marked secure, and sign-in links only safe to follow, over https.
  it('wants BETTER_AUTH_URL on https', () => {
    const problems = productionConfigProblems({
      ...COMPLETE,
      BETTER_AUTH_URL: 'http://xd.example',
    });

    expect(problems).toEqual(['BETTER_AUTH_URL must start with https://']);
  });

  it('refuses the fixture catalog', () => {
    const problems = productionConfigProblems({ ...COMPLETE, CATALOG_SOURCE: 'fixtures' });

    expect(problems).toEqual(['CATALOG_SOURCE must not be fixtures']);
  });

  it('lists every problem at once', () => {
    const problems = productionConfigProblems({
      ...COMPLETE,
      DATABASE_URL: undefined,
      SMTP_URL: undefined,
      CATALOG_SOURCE: 'fixtures',
    });

    expect(problems).toEqual([
      'DATABASE_URL is not set',
      'SMTP_URL is not set',
      'CATALOG_SOURCE must not be fixtures',
    ]);
  });

  // Locally, in CI and in the E2E run (next start, with fixtures and http://localhost), nothing is
  // checked: only the deploy Vercel marks as production.
  it.each`
    vercelEnv
    ${undefined}
    ${'preview'}
    ${'development'}
  `('checks nothing when VERCEL_ENV is $vercelEnv', ({ vercelEnv }) => {
    const problems = productionConfigProblems({
      VERCEL_ENV: vercelEnv,
      CATALOG_SOURCE: 'fixtures',
    });

    expect(problems).toEqual([]);
  });
});

describe('assertProductionConfig', () => {
  const failing = { ...COMPLETE, DATABASE_URL: undefined, BETTER_AUTH_URL: 'http://private-host' };

  it('refuses to start, naming each problem', () => {
    const act = () => assertProductionConfig(failing);

    expect(act).toThrow(
      'Production config: DATABASE_URL is not set; BETTER_AUTH_URL must start with https://',
    );
  });

  it('one problem is enough to refuse', () => {
    const act = () => assertProductionConfig({ ...COMPLETE, MAIL_FROM: undefined });

    expect(act).toThrow('Production config: MAIL_FROM is not set');
  });

  // The error ends up in deploy logs: it names variables, never what they hold.
  it('never shows a value', () => {
    const act = () => assertProductionConfig(failing);

    expect(act).not.toThrow(/private-host|db-password|mail-password|a-secret|tmdb-token/);
  });

  it('starts when nothing is wrong', () => {
    const act = () => assertProductionConfig(COMPLETE);

    expect(act).not.toThrow();
  });
});
