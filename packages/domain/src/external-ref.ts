import type { WorkId } from './work';

export type ExternalRef = { source: string; externalId: string };

export type WorkIndex = ReadonlyMap<string, WorkId>;

export type ResolvedRef = { index: WorkIndex; workId: WorkId };

export const emptyWorkIndex = (): WorkIndex => new Map();

const keyOf = (ref: ExternalRef): string => JSON.stringify([ref.source, ref.externalId]);

export function resolveRef(index: WorkIndex, ref: ExternalRef, candidateId: WorkId): ResolvedRef {
  const key = keyOf(ref);
  const existing = index.get(key);
  if (existing !== undefined) {
    return { index, workId: existing };
  }
  return { index: new Map(index).set(key, candidateId), workId: candidateId };
}
