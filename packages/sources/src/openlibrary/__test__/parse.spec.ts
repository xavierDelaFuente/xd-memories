import { describe, expect, it } from 'vitest';
import { unwrap } from '../../__test__/helpers';
import bookSearch from '../fixtures/search-dune.json' with { type: 'json' };
import { parseBookSearch } from '../parse';

describe('parseBookSearch (recorded Open Library response)', () => {
  it('parses a doc into a book keyed on the Open Library work', () => {
    const items = unwrap(parseBookSearch(bookSearch));

    expect(items[0]).toEqual({
      ref: { source: 'openlibrary', externalId: 'works/OL893414W' },
      mediaType: 'book',
      title: 'Dune',
      creators: ['Frank Herbert'],
      year: 1965,
    });
  });

  it('keeps Open Library order', () => {
    const items = unwrap(parseBookSearch(bookSearch));

    expect(items.slice(0, 3).map((item) => item.title)).toEqual([
      'Dune',
      'Dune Messiah',
      'Children of Dune',
    ]);
  });

  it('parses every doc on the page', () => {
    const items = unwrap(parseBookSearch(bookSearch));

    expect(items).toHaveLength(bookSearch.docs.length);
  });

  it('an empty page is an empty list', () => {
    const items = unwrap(parseBookSearch({ numFound: 0, docs: [] }));

    expect(items).toEqual([]);
  });
});

describe('authors and year', () => {
  it('keeps every author, in Open Library order', () => {
    const items = unwrap(parseBookSearch(bookSearch));

    expect(items.find((item) => item.title === 'Sandworms of Dune')?.creators).toEqual([
      'Kevin J. Anderson',
      'Brian Herbert',
    ]);
  });

  it('a work with no author has no creators', () => {
    const [book] = unwrap(parseBookSearch({ docs: [{ key: '/works/OL1W', title: 'Anonymous' }] }));

    expect(book?.creators).toEqual([]);
  });

  it('a work with no first publish year has no year', () => {
    const [book] = unwrap(parseBookSearch({ docs: [{ key: '/works/OL1W', title: 'Undated' }] }));

    expect(book?.year).toBeNull();
  });
});

it('a work is recognised by its /works/ path, whatever the id looks like', () => {
  const items = unwrap(
    parseBookSearch({ docs: [{ key: '/works/OL16477528M', title: 'Dossier sur les colonies' }] }),
  );

  expect(items[0]?.ref).toEqual({ source: 'openlibrary', externalId: 'works/OL16477528M' });
});

describe('malformed responses are typed errors, never casts or crashes', () => {
  const invalid = { ok: false, error: { kind: 'InvalidResponse', detail: expect.any(String) } };

  it.each`
    case                                  | payload
    ${'null'}                             | ${null}
    ${'no docs field'}                    | ${{ numFound: 0 }}
    ${'docs that is not a list'}          | ${{ docs: 'nope' }}
    ${'a doc without a title'}            | ${{ docs: [{ key: '/works/OL1W' }] }}
    ${'a key that is not text'}           | ${{ docs: [{ key: 42, title: 'Dune' }] }}
    ${'authors that are not a list'}      | ${{ docs: [{ key: '/works/OL1W', title: 'Dune', author_name: 'Frank Herbert' }] }}
    ${'an edition key instead of a work'} | ${{ docs: [{ key: '/books/OL7353617M', title: 'Dune' }] }}
  `('$case', ({ payload }: { payload: unknown }) => {
    const result = parseBookSearch(payload);

    expect(result).toEqual(invalid);
  });
});
