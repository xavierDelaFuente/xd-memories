import { describe, expect, it } from 'vitest';
import { modeFrom } from '../color-mode';

describe('modeFrom', () => {
  it.each`
    cookie       | mode
    ${'light'}   | ${'light'}
    ${'dark'}    | ${'dark'}
    ${undefined} | ${'system'}
    ${'system'}  | ${'system'}
    ${'purple'}  | ${'system'}
    ${''}        | ${'system'}
  `(
    'the cookie $cookie reads as $mode',
    ({ cookie, mode }: { cookie: string | undefined; mode: string }) => {
      const read = modeFrom(cookie);

      expect(read).toBe(mode);
    },
  );
});
