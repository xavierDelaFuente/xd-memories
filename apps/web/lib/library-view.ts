import { displayRating, type Entry, type Rating, type Status } from '@xd-memories/domain';
import { resultLabel } from './catalog-search';

export const STATUS_LABELS: Record<Status, string> = {
  want: 'Want',
  doing: 'In progress',
  done: 'Done',
};

type Shown = Parameters<typeof resultLabel>[0] & {
  status: Status;
  season: number | null;
  rating: Rating | null;
};

// A library row reads like the search result it was added from, so the same work looks the same.
export const libraryLabel = ({ status, season, rating, ...work }: Shown) =>
  [
    resultLabel(work),
    STATUS_LABELS[status],
    ...(season === null ? [] : [`Season ${season}`]),
    ...(rating === null ? [] : [`${displayRating(rating)}/100`]),
  ].join(' · ');

// UTC, so the server renders the same date wherever it runs.
const DAY = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

export const historyLabel = ({ status, at }: Pick<Entry, 'status' | 'at'>) =>
  `${STATUS_LABELS[status]} · ${DAY.format(at)}`;
