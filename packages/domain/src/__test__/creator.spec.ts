import { describe, expect, it } from 'vitest';
import { addCredit, type Credit, createCreator } from '../creator';

describe('createCreator', () => {
  it('creates a creator with a trimmed name', () => {
    const result = createCreator({ id: 'c1', name: ' Frank Herbert ' });

    expect(result).toEqual({ ok: true, value: { id: 'c1', name: 'Frank Herbert' } });
  });

  it.each(['', '   ', ' '])('rejects the blank name %j as a typed error', (name) => {
    const result = createCreator({ id: 'c1', name });

    expect(result).toEqual({ ok: false, error: { kind: 'BlankName' } });
  });
});

describe('addCredit', () => {
  const directing: Credit = { workId: 'w1', creatorId: 'c1', role: 'director' };
  const writing: Credit = { workId: 'w1', creatorId: 'c1', role: 'writer' };
  const coDirecting: Credit = { workId: 'w1', creatorId: 'c2', role: 'director' };
  const otherWork: Credit = { workId: 'w2', creatorId: 'c1', role: 'director' };

  it('adds a credit to an empty list', () => {
    const credits = addCredit([], directing);

    expect(credits).toEqual([directing]);
  });

  it.each`
    case                                         | existing                | added               | expected
    ${'same creator, work and role: one credit'} | ${[directing]}          | ${{ ...directing }} | ${[directing]}
    ${'same creator in two roles'}               | ${[directing]}          | ${writing}          | ${[directing, writing]}
    ${'same creator and role on another work'}   | ${[directing]}          | ${otherWork}        | ${[directing, otherWork]}
    ${'two creators on one work'}                | ${[directing]}          | ${coDirecting}      | ${[directing, coDirecting]}
    ${'a duplicate keeps the existing order'}    | ${[directing, writing]} | ${{ ...directing }} | ${[directing, writing]}
  `(
    '$case',
    ({ existing, added, expected }: { existing: Credit[]; added: Credit; expected: Credit[] }) => {
      const credits = addCredit(existing, added);

      expect(credits).toEqual(expected);
    },
  );

  it('never mutates the credits it was given', () => {
    const credits: readonly Credit[] = Object.freeze([directing]);

    const adding = () => addCredit(credits, writing);

    expect(adding).not.toThrow();
  });
});
