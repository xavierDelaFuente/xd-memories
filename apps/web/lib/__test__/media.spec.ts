import { MEDIA_TYPES, type MediaType } from '@xd-memories/domain';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MEDIA } from '../media';
import { MediaTag } from '../media-tag';

const oklch = (colour: string) => {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(colour);
  if (match === null) throw new Error(`not an oklch() colour: ${colour}`);
  const [, lightness, chroma, hue] = match.map(Number);
  return { lightness, chroma, hue };
};

describe('MEDIA', () => {
  it.each`
    mediaType   | label
    ${'movie'}  | ${'Movie'}
    ${'series'} | ${'Series'}
    ${'book'}   | ${'Book'}
    ${'album'}  | ${'Album'}
  `(
    'a $mediaType is labelled "$label"',
    ({ mediaType, label }: { mediaType: MediaType; label: string }) => {
      const shown = MEDIA[mediaType].label;

      expect(shown).toBe(label);
    },
  );

  it('gives each media type its own dot hue', () => {
    const hues = MEDIA_TYPES.map((mediaType) => oklch(MEDIA[mediaType].dot).hue);

    expect(new Set(hues).size).toBe(MEDIA_TYPES.length);
  });

  // Same lightness and chroma: no type stands out from the others (SCREENS.md).
  it('gives every dot the same lightness and chroma', () => {
    const shades = MEDIA_TYPES.map((mediaType) => {
      const { lightness, chroma } = oklch(MEDIA[mediaType].dot);
      return `${lightness} ${chroma}`;
    });

    expect(new Set(shades).size).toBe(1);
  });
});

describe('MediaTag', () => {
  // Colour is never the only signal: the dot is decoration, the label is what's read.
  it.each(MEDIA_TYPES.map((mediaType) => ({ mediaType })))(
    'a $mediaType shows its label next to a hidden dot in its colour',
    ({ mediaType }) => {
      const html = renderToStaticMarkup(createElement(MediaTag, { mediaType }));

      expect(html).toBe(
        `<span class="media-tag"><span class="media-dot" aria-hidden="true" style="background-color:${MEDIA[mediaType].dot}"></span>${MEDIA[mediaType].label}</span>`,
      );
    },
  );
});
