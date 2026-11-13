import type { MediaType } from '@xd-memories/domain';
import { MEDIA } from './media';

// A work's media: the label, with its coloured dot hidden from screen readers.
export function MediaTag({ mediaType }: { mediaType: MediaType }) {
  const { label, dot } = MEDIA[mediaType];
  return (
    <span className="media-tag">
      <span className="media-dot" aria-hidden="true" style={{ backgroundColor: dot }} />
      {label}
    </span>
  );
}
