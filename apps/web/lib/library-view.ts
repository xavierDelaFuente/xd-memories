import type { Status } from '@xd-memories/domain';
import { resultLabel } from './catalog-search';

export const STATUS_LABELS: Record<Status, string> = {
  want: 'Want',
  doing: 'In progress',
  done: 'Done',
};

type Shown = Parameters<typeof resultLabel>[0] & { status: Status };

// A library row reads like the search result it was added from, so the same work looks the same.
export const libraryLabel = ({ status, ...work }: Shown) =>
  `${resultLabel(work)} · ${STATUS_LABELS[status]}`;
