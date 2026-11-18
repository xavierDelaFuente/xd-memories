import type { Entry, MediaType, Status } from '@xd-memories/domain';

// Where works of different media are listed together, "doing" can't name one activity.
export const STATUS_LABELS: Record<Status, string> = {
  want: 'Want',
  doing: 'Active',
  done: 'Done',
  dropped: 'Dropped',
};

// Nothing starts out given up on: Dropped is set later, from the library.
export const ADD_STATUSES = ['want', 'doing', 'done'] as const satisfies readonly Status[];

const DOING: Record<MediaType, string> = {
  movie: 'Watching',
  series: 'Watching',
  book: 'Reading',
  album: 'Listening',
};

// One work, so one media: "doing" reads as what you do with it.
export const statusLabel = (status: Status, mediaType: MediaType) =>
  status === 'doing' ? DOING[mediaType] : STATUS_LABELS[status];

// UTC, so the server renders the same date wherever it runs.
const DAY = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

export const historyLabel = ({ status, at }: Pick<Entry, 'status' | 'at'>, mediaType: MediaType) =>
  `${statusLabel(status, mediaType)} · ${DAY.format(at)}`;

// How a go at a work ends.
const ENDS: Partial<Record<Status, string>> = { done: 'finished', dropped: 'dropped' };

// A work's dates, from its history (oldest first): when the latest go at it started, and how it
// ended, if it has; for a work never started or ended, when it was added. Earlier goes are in the
// history itself.
export function datesLabel(history: readonly Pick<Entry, 'status' | 'at'>[]): string {
  let started: Date | undefined;
  let ended: string | undefined;
  for (const { status, at } of history) {
    const end = ENDS[status];
    if (status === 'doing') [started, ended] = [at, undefined];
    else if (end !== undefined) ended = `${end} ${DAY.format(at)}`;
  }
  const parts = [...(started ? [`started ${DAY.format(started)}`] : []), ...(ended ? [ended] : [])];
  const [first] = history;
  if (parts.length === 0) return first === undefined ? '' : `Added ${DAY.format(first.at)}`;
  const label = parts.join(' · ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
