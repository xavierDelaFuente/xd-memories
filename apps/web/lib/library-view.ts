import {
  displayRating,
  type Entry,
  type MediaType,
  type Rating,
  type Status,
} from '@xd-memories/domain';
import { resultLabel } from './catalog-search';

// Where works of different media are listed together, "doing" can't name one activity.
export const STATUS_LABELS: Record<Status, string> = {
  want: 'Want',
  doing: 'In progress',
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

type Shown = Parameters<typeof resultLabel>[0] & {
  mediaType: MediaType;
  status: Status;
  season: number | null;
  rating: Rating | null;
};

// A library row reads like the search result it was added from, so the same work looks the same.
export const libraryLabel = ({ mediaType, status, season, rating, ...work }: Shown) =>
  [
    resultLabel(work),
    statusLabel(status, mediaType),
    ...(season === null ? [] : [`Season ${season}`]),
    ...(rating === null ? [] : [`${displayRating(rating)}/100`]),
  ].join(' · ');

// UTC, so the server renders the same date wherever it runs.
const DAY = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

export const historyLabel = ({ status, at }: Pick<Entry, 'status' | 'at'>, mediaType: MediaType) =>
  `${statusLabel(status, mediaType)} · ${DAY.format(at)}`;
