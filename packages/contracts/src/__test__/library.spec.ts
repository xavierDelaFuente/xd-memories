import type { CatalogItem } from '@xd-memories/domain';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  AddToLibraryForm,
  CatalogItemShape,
  ChangeStatusForm,
  HighlightForm,
  RateForm,
} from '../library';

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
    case                   | form
    ${'an unknown status'} | ${{ item: 'signed', status: 'paused' }}
    ${'a missing item'}    | ${{ item: '', status: 'want' }}
  `('rejects $case', ({ form }: { form: object }) => {
    const parsed = AddToLibraryForm.safeParse(form);

    expect(parsed.success).toBe(false);
  });
});

describe('ChangeStatusForm', () => {
  it('accepts a work id and a status', () => {
    const parsed = ChangeStatusForm.safeParse({ workId: 'w1', status: 'doing' });

    expect(parsed).toEqual({ success: true, data: { workId: 'w1', status: 'doing' } });
  });

  it.each`
    case                   | form
    ${'an unknown status'} | ${{ workId: 'w1', status: 'paused' }}
    ${'a missing work'}    | ${{ workId: '', status: 'done' }}
  `('rejects $case', ({ form }: { form: object }) => {
    const parsed = ChangeStatusForm.safeParse(form);

    expect(parsed.success).toBe(false);
  });
});

describe('RateForm', () => {
  it.each`
    rating    | value
    ${'87.5'} | ${87.5}
    ${' 0 '}  | ${0}
    ${'100'}  | ${100}
  `('reads "$rating" as $value', ({ rating, value }: { rating: string; value: number }) => {
    const parsed = RateForm.safeParse({ workId: 'w1', rating });

    expect(parsed).toEqual({ success: true, data: { workId: 'w1', rating: value } });
  });

  it.each`
    case                       | form
    ${'an empty rating'}       | ${{ workId: 'w1', rating: '' }}
    ${'a rating not a number'} | ${{ workId: 'w1', rating: 'great' }}
    ${'a missing work'}        | ${{ workId: '', rating: '50' }}
  `('rejects $case', ({ form }: { form: object }) => {
    const parsed = RateForm.safeParse(form);

    expect(parsed.success).toBe(false);
  });
});

describe('HighlightForm', () => {
  it('accepts a work id', () => {
    const parsed = HighlightForm.safeParse({ workId: 'w1' });

    expect(parsed).toEqual({ success: true, data: { workId: 'w1' } });
  });

  it('rejects a missing work', () => {
    const parsed = HighlightForm.safeParse({ workId: '' });

    expect(parsed.success).toBe(false);
  });
});
