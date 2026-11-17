import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Cover } from '../cover';

// The one element Cover renders: its tag and attributes, as an element would report them.
const render = (props: Parameters<typeof Cover>[0]) => {
  const markup = renderToStaticMarkup(createElement(Cover, props));
  const [, tag = '', rest = ''] = /^<(\w+)([^>]*?)\/?>/.exec(markup) ?? [];
  const attributes = new Map(
    [...rest.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name = '', value = '']) => [
      name.toLowerCase(),
      value,
    ]),
  );
  return {
    tagName: tag.toUpperCase(),
    className: attributes.get('class') ?? '',
    getAttribute: (name: string) => attributes.get(name) ?? null,
  };
};

const POSTER = 'https://image.tmdb.org/t/p/w342/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg';

describe('Cover', () => {
  // Beside its title, so a screen reader hears nothing more from it.
  it('shows the cover as an image with no text of its own', () => {
    const cover = render({ src: POSTER, mediaType: 'movie' });

    expect(cover?.tagName).toBe('IMG');
    expect(cover?.getAttribute('src')).toBe(POSTER);
    expect(cover?.getAttribute('alt')).toBe('');
  });

  // Straight from the source's host: lazily, and without telling it which page asked.
  it.each`
    attribute           | value
    ${'loading'}        | ${'lazy'}
    ${'referrerpolicy'} | ${'no-referrer'}
  `(
    'loads with $attribute="$value"',
    ({ attribute, value }: { attribute: string; value: string }) => {
      const cover = render({ src: POSTER, mediaType: 'movie' });

      expect(cover?.getAttribute(attribute)).toBe(value);
    },
  );

  it('with no cover, shows a placeholder hidden from screen readers', () => {
    const cover = render({ src: null, mediaType: 'book' });

    expect(cover?.tagName).toBe('SPAN');
    expect(cover?.getAttribute('aria-hidden')).toBe('true');
    expect(cover?.className).toBe('cover cover-empty');
  });

  // An album's cover is square; posters and book covers are taller than wide.
  it.each`
    mediaType   | shape
    ${'album'}  | ${'square'}
    ${'book'}   | ${'tall'}
    ${'movie'}  | ${'tall'}
    ${'series'} | ${'tall'}
  `(
    'a $mediaType cover is $shape',
    ({
      mediaType,
      shape,
    }: {
      mediaType: Parameters<typeof Cover>[0]['mediaType'];
      shape: string;
    }) => {
      const covers = [render({ src: POSTER, mediaType }), render({ src: null, mediaType })];

      expect(covers.map((cover) => cover?.getAttribute('data-shape'))).toEqual([shape, shape]);
    },
  );
});
