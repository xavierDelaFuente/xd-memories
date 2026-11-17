import {
  displayRating,
  type MediaType,
  type Rating,
  STATUSES,
  type Status,
} from '@xd-memories/domain';
import { STATUS_LABELS, statusLabel } from './library-view';
import { SECTION_LABELS, SEGMENTS } from './media-links';
import type { NavLink } from './nav';

// What the library shows: one media or all, and always one status.
export type LibraryFilter = { media: MediaType | null; status: Status };

type Filed = { mediaType: MediaType; status: Status };
type Params = { media?: string | string[] | undefined; status?: string | string[] | undefined };

// The tabs' order: what you're on now first, as the design has it.
const TABS: readonly Status[] = ['doing', 'want', 'done', 'dropped'];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const isStatus = (value: string | undefined): value is Status =>
  (STATUSES as readonly string[]).includes(value ?? '');
const segmentOf = (media: MediaType) =>
  [...SEGMENTS].find(([, mediaType]) => mediaType === media)?.[0];

const inMedia = (media: MediaType | null) => (item: Filed) =>
  media === null || item.mediaType === media;

// ?media=books&status=want, as the URL has it. With no status asked for, the first tab with
// something in it opens, so the library never opens on an empty list it doesn't have to.
export function libraryFilter(items: readonly Filed[], params: Params): LibraryFilter {
  const media = SEGMENTS.get(first(params.media) ?? '') ?? null;
  const asked = first(params.status);
  if (isStatus(asked)) return { media, status: asked };
  const filed = items.filter(inMedia(media));
  const status = TABS.find((tab) => filed.some((item) => item.status === tab)) ?? 'doing';
  return { media, status };
}

export const shownItems = <T extends Filed>(
  items: readonly T[],
  { media, status }: LibraryFilter,
) => items.filter((item) => inMedia(media)(item) && item.status === status);

const href = (params: Record<string, string | undefined>) => {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined),
  ).toString();
  return query === '' ? '/library' : `/library?${query}`;
};

// All, then each media. Switching media drops the status: the new media opens on a tab it fills.
export function libraryMediaLinks({ media }: LibraryFilter): NavLink[] {
  return [
    { href: '/library', label: 'All', current: media === null },
    ...[...SEGMENTS].map(([segment, mediaType]) => ({
      href: href({ media: segment }),
      label: SECTION_LABELS[mediaType],
      current: mediaType === media,
    })),
  ];
}

// One tab per status, counted within the media shown. Across media "doing" is Active; within
// one it names the activity, Reading for books.
export function statusTabs(
  items: readonly Filed[],
  { media, status }: LibraryFilter,
): (NavLink & { count: number })[] {
  const filed = items.filter(inMedia(media));
  return TABS.map((tab) => ({
    href: href({ media: media === null ? undefined : segmentOf(media), status: tab }),
    label: media === null ? STATUS_LABELS[tab] : statusLabel(tab, media),
    current: tab === status,
    count: filed.filter((item) => item.status === tab).length,
  }));
}

// The line under a title: who made it, when, and how far a series has got.
export const rowMeta = ({
  creators,
  year,
  season,
}: {
  creators: readonly string[];
  year: number | null;
  season: number | null;
}) =>
  [
    ...(creators.length === 0 ? [] : [creators.join(', ')]),
    ...(year === null ? [] : [String(year)]),
    ...(season === null ? [] : [`Season ${season}`]),
  ].join(' · ');

export const ratingLabel = (rating: Rating) => `${displayRating(rating)}/100`;
