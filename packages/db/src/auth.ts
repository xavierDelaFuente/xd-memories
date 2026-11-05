import { type BetterAuthOptions, type BetterAuthPlugin, betterAuth } from 'better-auth';
import type { Kysely } from 'kysely';

export type AuthSettings = {
  db: Kysely<unknown>;
  secret: string;
  baseURL: string;
  // The host framework's integration, such as nextCookies() in apps/web.
  plugins?: BetterAuthPlugin[];
};

const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' };

// Better Auth's tables, in our naming. 0003-auth creates them; a test checks the two never drift.
const SCHEMA = {
  user: {
    modelName: 'users',
    fields: { emailVerified: 'email_verified', ...timestamps },
  },
  session: {
    modelName: 'sessions',
    fields: {
      expiresAt: 'expires_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      userId: 'user_id',
      ...timestamps,
    },
  },
  account: {
    modelName: 'accounts',
    fields: {
      accountId: 'account_id',
      providerId: 'provider_id',
      userId: 'user_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      ...timestamps,
    },
  },
  verification: {
    modelName: 'verifications',
    fields: { expiresAt: 'expires_at', ...timestamps },
  },
} satisfies Partial<BetterAuthOptions>;

// Endpoints the app has no use for, each of which changes an account or exposes its sessions.
// Off for everyone: on the shared demo account (demo.ts) any visitor could otherwise rename it,
// list other visitors' sessions (IP addresses, browsers) or end them. Turn one back on only with
// a page that needs it, and a guard for read-only users.
const UNUSED_PATHS = [
  '/update-user',
  '/change-email',
  '/change-password',
  '/delete-user',
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
];

export function authOptions({ db, secret, baseURL, plugins = [] }: AuthSettings) {
  return {
    database: { db, type: 'postgres' },
    secret,
    baseURL,
    // Verification and reset arrive with a mailer (BACKLOG 3.13), before anyone else signs up.
    emailAndPassword: { enabled: true },
    disabledPaths: UNUSED_PATHS,
    plugins,
    ...SCHEMA,
  } satisfies BetterAuthOptions;
}

export const createAuth = (settings: AuthSettings) => betterAuth(authOptions(settings));
