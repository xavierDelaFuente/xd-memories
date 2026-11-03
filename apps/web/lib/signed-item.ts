import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';
import { CatalogItemShape } from '@xd-memories/contracts';
import { type CatalogItem, err, ok, type Result } from '@xd-memories/domain';
import { z } from 'zod';

// Search results travel to the browser and back on "Add". Works are shared by every user, so
// the server saves only what it signed itself: the browser can't post a made-up title.

export type SignedItemError = { kind: 'Invalid' } | { kind: 'Expired' };

type Signing = { secret: string; now: Date };

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const Payload = z.object({ item: CatalogItemShape, signedAt: z.int() });

// Its own key, derived from the app secret: a signature made for anything else never verifies.
const keyFrom = (secret: string) =>
  Buffer.from(hkdfSync('sha256', secret, '', 'xd-memories signed catalog item', 32));

const signatureOf = (payload: string, secret: string) =>
  createHmac('sha256', keyFrom(secret)).update(payload).digest();

export function signItem(item: CatalogItem, { secret, now }: Signing): string {
  const payload = Buffer.from(JSON.stringify({ item, signedAt: now.getTime() })).toString(
    'base64url',
  );
  return `${payload}.${signatureOf(payload, secret).toString('base64url')}`;
}

export function verifyItem(
  token: string,
  { secret, now }: Signing,
): Result<CatalogItem, SignedItemError> {
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) return err({ kind: 'Invalid' });

  const expected = signatureOf(payload, secret);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return err({ kind: 'Invalid' });
  }

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return err({ kind: 'Invalid' });
  }
  const parsed = Payload.safeParse(json);
  if (!parsed.success) return err({ kind: 'Invalid' });
  if (now.getTime() - parsed.data.signedAt > MAX_AGE_MS) return err({ kind: 'Expired' });
  return ok(parsed.data.item);
}
