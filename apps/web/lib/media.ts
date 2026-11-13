import type { MediaType } from '@xd-memories/domain';

// The dot is decoration beside the label, never instead of it. Same lightness and chroma, so no
// type stands out (docs/design/SCREENS.md).
export const MEDIA: Record<MediaType, { label: string; dot: string }> = {
  movie: { label: 'Movie', dot: 'oklch(0.62 0.13 35)' },
  series: { label: 'Series', dot: 'oklch(0.62 0.13 250)' },
  book: { label: 'Book', dot: 'oklch(0.62 0.13 150)' },
  album: { label: 'Album', dot: 'oklch(0.62 0.13 320)' },
};
