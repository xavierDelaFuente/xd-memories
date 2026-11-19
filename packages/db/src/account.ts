import { err, ok, type Result } from '@xd-memories/domain';
import { APIError } from 'better-auth/api';
import { type createAuth, READ_ONLY } from './auth';

export type DeleteAccountError = { kind: 'WrongPassword' } | { kind: 'ReadOnly' };

type Auth = ReturnType<typeof createAuth>;

// Deletes the signed-in user (from the request's headers) and everything of theirs: sessions,
// accounts, entries, ratings, progress, highlights. Works and their refs stay: the catalog is
// shared. Always with the password: given none, Better Auth would accept a fresh session alone.
export async function deleteAccount(
  auth: Auth,
  { headers, password }: { headers: Headers; password: string },
): Promise<Result<void, DeleteAccountError>> {
  if (password === '') return err({ kind: 'WrongPassword' });
  try {
    await auth.api.deleteUser({ headers, body: { password } });
    return ok(undefined);
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    if (error.body?.code === 'INVALID_PASSWORD') return err({ kind: 'WrongPassword' });
    if (error.body?.code === READ_ONLY) return err({ kind: 'ReadOnly' });
    throw error;
  }
}
