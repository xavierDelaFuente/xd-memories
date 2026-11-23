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

// Which go at a work one work's history (oldest first) is on: each done ends a go, and a doing
// after the last done starts the next, so the second go is a re-read even before it ends. Wanting
// it again isn't a go; a go given up on still counts. 0 for a work never started.
export function goNumber(history: readonly Pick<Entry, 'status'>[]): number {
  let finished = 0;
  let going = false;
  for (const { status } of history) {
    if (status === 'done') [finished, going] = [finished + 1, false];
    else if (status === 'doing') going = true;
  }
  return finished + (going ? 1 : 0);
}
