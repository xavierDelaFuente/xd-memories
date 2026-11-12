import { describe, expect, it } from 'vitest';
import { navLinks } from '../nav';

describe('navLinks', () => {
  it.each`
    signedIn | labels
    ${false} | ${['Catalog', 'Sign in']}
    ${true}  | ${['Catalog', 'Library']}
  `(
    'signed in: $signedIn, the links are $labels',
    ({ signedIn, labels }: { signedIn: boolean; labels: string[] }) => {
      const links = navLinks(signedIn, '/');

      expect(links.map(({ label }) => label)).toEqual(labels);
    },
  );

  it.each`
    signedIn | pathname             | current
    ${true}  | ${'/catalog/movies'} | ${'Catalog'}
    ${true}  | ${'/catalog/books'}  | ${'Catalog'}
    ${true}  | ${'/library'}        | ${'Library'}
    ${false} | ${'/sign-in'}        | ${'Sign in'}
    ${true}  | ${'/'}               | ${undefined}
    ${true}  | ${'/people/42'}      | ${undefined}
    ${true}  | ${'/catalogue'}      | ${undefined}
    ${true}  | ${'/library-x'}      | ${undefined}
  `(
    'on $pathname, the current link is $current',
    ({
      signedIn,
      pathname,
      current,
    }: {
      signedIn: boolean;
      pathname: string;
      current: string | undefined;
    }) => {
      const links = navLinks(signedIn, pathname);

      expect(links.find((link) => link.current)?.label).toBe(current);
    },
  );
});
