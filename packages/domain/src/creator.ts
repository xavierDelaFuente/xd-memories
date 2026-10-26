import { err, ok, type Result } from './result';
import { nonBlank } from './text';
import type { WorkId } from './work';

export type CreatorId = string;

export type Creator = { id: CreatorId; name: string };

export type CreatorInput = { id: CreatorId; name: string };

export type CreatorError = { kind: 'BlankName' };

export type Role = 'author' | 'director' | 'writer' | 'artist';

export type Credit = { workId: WorkId; creatorId: CreatorId; role: Role };

export function createCreator({ id, name }: CreatorInput): Result<Creator, CreatorError> {
  const trimmed = nonBlank(name);
  if (trimmed === undefined) return err({ kind: 'BlankName' });
  return ok({ id, name: trimmed });
}

const sameCredit = (a: Credit, b: Credit): boolean =>
  a.workId === b.workId && a.creatorId === b.creatorId && a.role === b.role;

export function addCredit(credits: readonly Credit[], credit: Credit): Credit[] {
  return credits.some((existing) => sameCredit(existing, credit))
    ? [...credits]
    : [...credits, credit];
}
