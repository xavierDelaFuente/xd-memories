import { APIError } from 'better-auth/api';

const GENERIC = 'Something went wrong. Try again in a moment.';

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
  // Signing in before confirming mails a new link (packages/db auth.ts).
  EMAIL_NOT_VERIFIED: "Confirm your email first: we've sent you a new link.",
  INVALID_TOKEN: 'This link has expired or was already used. Ask for a new one.',
  INVALID_EMAIL: 'Enter a valid email address.',
  PASSWORD_TOO_SHORT: 'Use at least 8 characters for the password.',
  PASSWORD_TOO_LONG: 'Use at most 128 characters for the password.',
};

// What the auth forms show. A taken address is not among them: sign-up answers it like a new one,
// so the form never tells a visitor who has an account. Anything unexpected stays generic: raw
// errors can leak internals, such as a database host.
export function messageForAuthError(error: unknown): string {
  return error instanceof APIError ? messageForAuthCode(error.body?.code) : GENERIC;
}

// Also for the codes Better Auth puts in a redirect, such as ?error=INVALID_TOKEN.
export function messageForAuthCode(code: string | undefined): string {
  return (code !== undefined && Object.hasOwn(MESSAGES, code) && MESSAGES[code]) || GENERIC;
}
