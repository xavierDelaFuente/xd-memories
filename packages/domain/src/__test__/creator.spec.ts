import { describe, expect, it } from 'vitest';
import { addCredit, type Credit, createCreator } from '../creator';

describe('createCreator', () => {
  it('creates a creator with a trimmed name', () => {
    expect(createCreator({ id: 'c1', name: ' Frank Herbert ' })).toEqual({
      ok: true,
      value: { id: 'c1', name: 'Frank Herbert' },
    });
  });

  it.each(['', '   ', ' '])('rejects the blank name %j as a typed error', (name) => {
    expect(createCreator({ id: 'c1', name })).toEqual({ ok: false, error: { kind: 'BlankName' } });
  });
});

describe('addCredit', () => {
  const directing: Credit = { workId: 'w1', creatorId: 'c1', role: 'director' };
  const writing: Credit = { workId: 'w1', creatorId: 'c1', role: 'writer' };

  it('adds a credit to the list', () => {
    expect(addCredit([], directing)).toEqual([directing]);
  });

  it('the same creator, work and role twice is one credit', () => {
    expect(addCredit([directing], { ...directing })).toEqual([directing]);
  });

  it('the same creator in two roles on one work is two credits', () => {
    expect(addCredit([directing], writing)).toEqual([directing, writing]);
  });

  it('the same creator and role on another work is another credit', () => {
    const otherWork: Credit = { ...directing, workId: 'w2' };

    expect(addCredit([directing], otherWork)).toEqual([directing, otherWork]);
  });

  it('never mutates the credits it was given', () => {
    const credits: readonly Credit[] = Object.freeze([directing]);

    expect(() => addCredit(credits, writing)).not.toThrow();
  });

  it('several creators on one work are separate credits', () => {
    const coDirecting: Credit = { workId: 'w1', creatorId: 'c2', role: 'director' };

    expect(addCredit([directing], coDirecting)).toEqual([directing, coDirecting]);
  });

  it('a duplicate leaves the existing order untouched', () => {
    expect(addCredit([directing, writing], { ...directing })).toEqual([directing, writing]);
  });
});
