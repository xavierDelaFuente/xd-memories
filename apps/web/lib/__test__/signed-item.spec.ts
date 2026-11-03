import type { CatalogItem } from '@xd-memories/domain';
import { describe, expect, it } from 'vitest';
import { signItem, verifyItem } from '../signed-item';

const secret = 'test-secret-that-is-at-least-32-characters';
const signedAt = new Date('2026-11-03T10:00:00Z');
const later = (ms: number) => new Date(signedAt.getTime() + ms);
const HOUR = 60 * 60 * 1000;

const dune: CatalogItem = {
  ref: { source: 'openlibrary', externalId: 'works/OL893414W' },
  mediaType: 'book',
  title: 'Dune',
  creators: ['Frank Herbert'],
  year: 1965,
  sourceVersion: 'search.json',
  raw: { key: '/works/OL893414W', title: 'Dune', edition_count: 81 },
};

const token = signItem(dune, { secret, now: signedAt });

// The signed payload, edited the way someone tampering with the form would.
const tampered = (change: (payload: { item: CatalogItem }) => void) => {
  const [payload, signature] = token.split('.');
  const decoded = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString());
  change(decoded);
  return `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${signature}`;
};

describe('verifyItem', () => {
  it('returns the item that was signed', () => {
    const verified = verifyItem(token, { secret, now: later(HOUR) });

    expect(verified).toEqual({ ok: true, value: dune });
  });

  it('rejects an item whose title was changed', () => {
    const forged = tampered((payload) => {
      payload.item.title = 'Not Dune';
    });

    const verified = verifyItem(forged, { secret, now: signedAt });

    expect(verified).toEqual({ ok: false, error: { kind: 'Invalid' } });
  });

  it('rejects an item signed with another secret', () => {
    const foreign = signItem(dune, { secret: `${secret}-other`, now: signedAt });

    const verified = verifyItem(foreign, { secret, now: signedAt });

    expect(verified).toEqual({ ok: false, error: { kind: 'Invalid' } });
  });

  it.each(['', 'not-a-token', 'a.b', 'a.b.c', `${token}x`, `.${token.split('.')[1]}`])(
    'rejects the malformed token %j',
    (malformed) => {
      const verified = verifyItem(malformed, { secret, now: signedAt });

      expect(verified).toEqual({ ok: false, error: { kind: 'Invalid' } });
    },
  );

  it.each`
    age                    | ms
    ${'just signed'}       | ${0}
    ${'exactly a day old'} | ${24 * HOUR}
  `('accepts an item $age', ({ ms }: { ms: number }) => {
    const verified = verifyItem(token, { secret, now: later(ms) });

    expect(verified.ok).toBe(true);
  });

  it('rejects an item more than a day old: search again for fresh data', () => {
    const verified = verifyItem(token, { secret, now: later(24 * HOUR + 1) });

    expect(verified).toEqual({ ok: false, error: { kind: 'Expired' } });
  });
});
