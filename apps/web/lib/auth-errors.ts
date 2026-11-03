import { APIError } from 'better-auth/api';

const GENERIC = 'Something went wrong. Try again in a moment.';

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
  USER_ALREADY_EXISTS: 'An account with this email already exists.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with this email already exists.',
  INVALID_EMAIL: 'Enter a valid email address.',
  PASSWORD_TOO_SHORT: 'Use at least 8 characters for the password.',
  PASSWORD_TOO_LONG: 'Use at most 128 characters for the password.',
};

// What the sign-up and sign-in forms show. Anything unexpected stays generic: raw errors can
// leak internals, such as a database host.
export function messageForAuthError(error: unknown): string {
  if (!(error instanceof APIError)) return GENERIC;
  const code = error.body?.code;
  return (code !== undefined && Object.hasOwn(MESSAGES, code) && MESSAGES[code]) || GENERIC;
}
