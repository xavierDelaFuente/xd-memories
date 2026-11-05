import type { Mailer } from '@xd-memories/mail';
import { type BetterAuthOptions, type BetterAuthPlugin, betterAuth } from 'better-auth';
import type { Kysely } from 'kysely';
import { DEMO } from './demo';

export type AuthSettings = {
  db: Kysely<unknown>;
  secret: string;
  baseURL: string;
  // Sends the links that confirm an address and reset a password.
  mailer: Mailer;
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

// Anyone can sign up with any address, so these mails carry nothing a visitor typed: only the link.
const confirmMail = (url: string) => ({
  subject: 'Confirm your email for xd-memories',
  text: `Confirm your email to start using xd-memories:\n\n${url}\n\nThe link works for an hour. If you didn't sign up, ignore this email.`,
});

const resetMail = (url: string) => ({
  subject: 'Reset your xd-memories password',
  text: `Set a new password for xd-memories:\n\n${url}\n\nThe link works once, for an hour. If you didn't ask for it, ignore this email: your password stays as it is.`,
});

export function authOptions({ db, secret, baseURL, mailer, plugins = [] }: AuthSettings) {
  return {
    database: { db, type: 'postgres' },
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
      // No session until the address is confirmed; signing in before that mails a new link.
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        // The shared demo's password is derived, never set (demo.ts); its address takes no mail.
        if (user.id === DEMO.id) return;
        await mailer.send({ to: user.email, ...resetMail(url) });
      },
      // Whoever had the old password, such as on a lost laptop, is signed out.
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.send({ to: user.email, ...confirmMail(url) });
      },
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },
    disabledPaths: UNUSED_PATHS,
    plugins,
    ...SCHEMA,
  } satisfies BetterAuthOptions;
}

export const createAuth = (settings: AuthSettings) => betterAuth(authOptions(settings));
