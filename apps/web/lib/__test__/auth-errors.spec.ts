import { APIError } from 'better-auth/api';
import { describe, expect, it } from 'vitest';
import { messageForAuthError } from '../auth-errors';

describe('messageForAuthError', () => {
  it.each`
    code                                       | message
    ${'INVALID_EMAIL_OR_PASSWORD'}             | ${'Wrong email or password.'}
    ${'USER_ALREADY_EXISTS'}                   | ${'An account with this email already exists.'}
    ${'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'} | ${'An account with this email already exists.'}
    ${'INVALID_EMAIL'}                         | ${'Enter a valid email address.'}
    ${'PASSWORD_TOO_SHORT'}                    | ${'Use at least 8 characters for the password.'}
    ${'PASSWORD_TOO_LONG'}                     | ${'Use at most 128 characters for the password.'}
  `(
    'Better Auth $code reads "$message"',
    ({ code, message }: { code: string; message: string }) => {
      const error = new APIError('BAD_REQUEST', { code, message: 'raw' });

      const shown = messageForAuthError(error);

      expect(shown).toBe(message);
    },
  );

  it.each`
    case                                 | error
    ${'an auth error we do not expect'}  | ${new APIError('INTERNAL_SERVER_ERROR', { code: 'FAILED_TO_CREATE_USER' })}
    ${'anything else, like a DB outage'} | ${new Error('connect ECONNREFUSED')}
  `('$case reads as a generic retry, never the raw error', ({ error }: { error: unknown }) => {
    const shown = messageForAuthError(error);

    expect(shown).toBe('Something went wrong. Try again in a moment.');
  });
});
