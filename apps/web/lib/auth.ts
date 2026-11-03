import { connect, createAuth } from '@xd-memories/db';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example).`);
  return value;
}

// Signs sessions, and (through a derived key) search results: see signed-item.ts.
export const appSecret = () => required('BETTER_AUTH_SECRET');

let db: ReturnType<typeof connect> | undefined;
let auth: ReturnType<typeof createAuth> | undefined;

// Built on first use, not at import: next build runs without database settings.
export function getDb() {
  db ??= connect(required('DATABASE_URL'));
  return db;
}

export function getAuth() {
  auth ??= createAuth({
    db: getDb(),
    secret: appSecret(),
    baseURL: required('BETTER_AUTH_URL'),
    // Lets server actions set the session cookie.
    plugins: [nextCookies()],
  });
  return auth;
}

// Reads the request first: that makes every page calling this per-request, so next build never
// prerenders it (and never needs database settings).
export async function currentSession() {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}
