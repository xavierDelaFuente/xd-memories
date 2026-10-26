import { err, ok, type Result } from './result';
import type { WorkId } from './work';

export type Ordering = { name: string; workIds: readonly WorkId[] };

export type Series = { id: string; orderings: readonly Ordering[] };

export type Progress = {
  position: number;
  next: { position: number; workId: WorkId } | null;
};

export type OrderingError = { kind: 'DuplicateOrdering'; name: string };

export function progress(ordering: Ordering, doneWorkIds: readonly WorkId[]): Progress {
  const done = new Set(doneWorkIds);
  const position = ordering.workIds.reduce(
    (highest, workId, index) => (done.has(workId) ? index + 1 : highest),
    0,
  );
  const nextWorkId = ordering.workIds[position];
  return {
    position,
    next: nextWorkId === undefined ? null : { position: position + 1, workId: nextWorkId },
  };
}

export const createSeries = (id: string): Series => ({ id, orderings: [] });

export function addOrdering(series: Series, ordering: Ordering): Result<Series, OrderingError> {
  if (orderingNamed(series, ordering.name) !== undefined) {
    return err({ kind: 'DuplicateOrdering', name: ordering.name });
  }
  return ok({ ...series, orderings: [...series.orderings, ordering] });
}

export function orderingNamed(series: Series, name: string): Ordering | undefined {
  return series.orderings.find((ordering) => ordering.name === name);
}
