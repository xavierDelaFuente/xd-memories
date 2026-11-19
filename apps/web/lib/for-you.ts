import type { MediaType, Status } from '@xd-memories/domain';
import { dayLabel, statusLabel } from './library-view';

// Continue (screens 1a, 1h): what you're in the middle of. The library comes most recent first,
// so the work you last started leads.
export const continueItems = <Item extends { status: Status }>(library: readonly Item[]): Item[] =>
  library.filter(({ status }) => status === 'doing');

// Where you are with it. Pages and episodes aren't recorded yet, so a season where there is one,
// and when you started: the latest entry of a work in progress is when it began.
export const continueMeta = ({
  mediaType,
  season,
  at,
}: {
  mediaType: MediaType;
  season: number | null;
  at: Date;
}) =>
  [
    ...(season === null ? [] : [`Season ${season}`]),
    `${statusLabel('doing', mediaType)} since ${dayLabel(at)}`,
  ].join(' · ');
