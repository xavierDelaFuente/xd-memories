import type { CatalogItem } from '@xd-memories/domain';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { AddToLibraryForm, CatalogItemShape } from '../library';

const dune = {
  ref: { source: 'openlibrary', externalId: 'works/OL893414W' },
  mediaType: 'book',
  title: 'Dune',
  creators: ['Frank Herbert'],
  year: 1965,
  sourceVersion: 'search.json',
  raw: { key: '/works/OL893414W', title: 'Dune' },
};

describe('CatalogItemShape', () => {
  it('accepts a catalog item as a source parsed it', () => {
    const parsed = CatalogItemShape.safeParse(dune);

    expect(parsed).toEqual({ success: true, data: dune });
  });

  it.each`
    case                    | change
    ${'blank title'}        | ${{ title: '  ' }}
    ${'unknown media type'} | ${{ mediaType: 'podcast' }}
    ${'year with decimals'} | ${{ year: 1965.5 }}
    ${'no source version'}  | ${{ sourceVersion: '' }}
    ${'ref without an id'}  | ${{ ref: { source: 'openlibrary', externalId: '' } }}
  `('rejects a $case', ({ change }: { change: object }) => {
    const parsed = CatalogItemShape.safeParse({ ...dune, ...change });

    expect(parsed.success).toBe(false);
  });

  it('infers the domain CatalogItem', () => {
    expectTypeOf<ReturnType<typeof CatalogItemShape.parse>>().toExtend<CatalogItem>();
  });
});

describe('AddToLibraryForm', () => {
  it.each(['want', 'doing', 'done'])('accepts the status %s', (status) => {
    const parsed = AddToLibraryForm.safeParse({ item: 'signed', status });

    expect(parsed).toEqual({ success: true, data: { item: 'signed', status } });
  });

  it.each`
    case                | form
    ${'unknown status'} | ${{ item: 'signed', status: 'paused' }}
    ${'missing item'}   | ${{ item: '', status: 'want' }}
  `('rejects an $case', ({ form }: { form: object }) => {
    const parsed = AddToLibraryForm.safeParse(form);

    expect(parsed.success).toBe(false);
  });
});
