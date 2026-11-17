'use client';

import type { MediaType } from '@xd-memories/domain';
import { useEffect, useRef, useState } from 'react';

// An album's cover is square; posters and book covers are taller than wide.
const shapeOf = (mediaType: MediaType) => (mediaType === 'album' ? 'square' : 'tall');

// A work's cover, beside its title: straight from the source's host, lazily and with no referrer.
// When there is none, or it doesn't load (Cover Art Archive can't say ahead), a placeholder.
export function Cover({ src, mediaType }: { src: string | null; mediaType: MediaType }) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);

  // An image that failed before the page hydrated fired its error with no one listening.
  useEffect(() => {
    const loaded = image.current;
    if (loaded?.complete && loaded.naturalWidth === 0) setFailed(true);
  }, []);

  const shape = shapeOf(mediaType);
  if (src === null || failed) {
    return <span className="cover cover-empty" aria-hidden="true" data-shape={shape} />;
  }
  return (
    // biome-ignore lint/performance/noImgElement: covers load straight from the source's host, not through Next's image optimiser.
    <img
      ref={image}
      className="cover"
      data-shape={shape}
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
