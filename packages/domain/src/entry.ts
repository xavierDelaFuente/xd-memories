import type { WorkId } from './work';

export const STATUSES = ['want', 'doing', 'done', 'dropped'] as const;

export type Status = (typeof STATUSES)[number];

export type Entry = {
  workId: WorkId;
  status: Status;
  at: Date;
};

export type LogStatusInput = Omit<Entry, 'at'> & { now: Date };

export function logStatus(history: readonly Entry[], { now, ...entry }: LogStatusInput): Entry[] {
  return [...history, { ...entry, at: now }];
}
