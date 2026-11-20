type Env = Record<string, string | undefined>;

// What the production deploy cannot run without (see .env.example). A missing one would otherwise
// surface only later, on the first request that needs it, such as the first sign-up's mail.
const REQUIRED = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'TMDB_API_TOKEN',
  'MUSICBRAINZ_USER_AGENT',
  'SMTP_URL',
  'MAIL_FROM',
] as const;

// What is wrong with the production config, each naming a variable, never its value: these end up
// in deploy logs. Only the deploy Vercel marks as production is checked; locally, in CI and in
// the E2E run, fixtures and http://localhost are expected.
export function productionConfigProblems(env: Env): string[] {
  if (env.VERCEL_ENV !== 'production') return [];

  const problems = REQUIRED.filter((name) => !env[name]).map((name) => `${name} is not set`);
  // Session cookies are only marked secure, and mailed links only safe to follow, over https.
  if (env.BETTER_AUTH_URL && !env.BETTER_AUTH_URL.startsWith('https://')) {
    problems.push('BETTER_AUTH_URL must start with https://');
  }
  if (env.CATALOG_SOURCE === 'fixtures') problems.push('CATALOG_SOURCE must not be fixtures');
  return problems;
}

// Called once as the server starts (instrumentation.ts): it refuses to serve a single request.
export function assertProductionConfig(env: Env): void {
  const problems = productionConfigProblems(env);
  if (problems.length > 0) throw new Error(`Production config: ${problems.join('; ')}`);
}
