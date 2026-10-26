import { describe, expect, it } from 'vitest';
import { emptyWorkIndex, resolveRef } from '../external-ref';

const matrix = { source: 'tmdb', externalId: '603' };

describe('resolveRef', () => {
  it('two refs with the same source and id resolve to one WorkId', () => {
    const first = resolveRef(emptyWorkIndex(), matrix, 'work-1');

    const second = resolveRef(first.index, { source: 'tmdb', externalId: '603' }, 'work-2');

    expect(second.workId).toBe('work-1');
  });

  it('a different id from the same source is a different work', () => {
    const first = resolveRef(emptyWorkIndex(), matrix, 'work-1');

    const second = resolveRef(first.index, { source: 'tmdb', externalId: '604' }, 'work-2');

    expect(second.workId).toBe('work-2');
  });

  it('the same id from a different source is a different work', () => {
    const first = resolveRef(emptyWorkIndex(), matrix, 'work-1');

    const second = resolveRef(first.index, { source: 'openlibrary', externalId: '603' }, 'work-2');

    expect(second.workId).toBe('work-2');
  });

  it('links a second source to an existing work when that work is passed as the candidate', () => {
    const tmdb = resolveRef(emptyWorkIndex(), matrix, 'work-1');

    const imdb = resolveRef(tmdb.index, { source: 'imdb', externalId: 'tt0133093' }, tmdb.workId);
    const again = resolveRef(imdb.index, { source: 'imdb', externalId: 'tt0133093' }, 'work-9');

    expect(again.workId).toBe('work-1');
  });

  it('never mutates the index it was given', () => {
    const empty = emptyWorkIndex();

    resolveRef(empty, matrix, 'work-1');

    expect(empty.size).toBe(0);
    expect(resolveRef(empty, matrix, 'work-2').workId).toBe('work-2');
  });

  it('cannot confuse refs whose source and id contain a separator', () => {
    const first = resolveRef(emptyWorkIndex(), { source: 'a:b', externalId: 'c' }, 'work-1');

    const second = resolveRef(first.index, { source: 'a', externalId: 'b:c' }, 'work-2');

    expect(second.workId).toBe('work-2');
  });
});
