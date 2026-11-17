import { describe, expect, it } from 'vitest';
import { navLinks } from '../nav';

describe('navLinks', () => {
  it.each`
    signedIn | labels
    ${false} | ${['Browse', 'Sign in']}
    ${true}  | ${['For you', 'Browse', 'Library']}
  `(
    'signed in: $signedIn, the links are $labels',
    ({ signedIn, labels }: { signedIn: boolean; labels: string[] }) => {
      const links = navLinks(signedIn, '/');

      expect(links.map(({ label }) => label)).toEqual(labels);
    },
  );

  // On a wider screen the sidebar lists the media instead, each straight into the catalog.
  it('only Browse is for phones alone', () => {
    const links = navLinks(true, '/');

    expect(links.filter((link) => link.phoneOnly).map(({ label }) => label)).toEqual(['Browse']);
  });

  it.each`
    signedIn | pathname             | current
    ${true}  | ${'/'}               | ${'For you'}
    ${true}  | ${'/catalog/movies'} | ${'Browse'}
    ${true}  | ${'/catalog/books'}  | ${'Browse'}
    ${true}  | ${'/library'}        | ${'Library'}
    ${false} | ${'/sign-in'}        | ${'Sign in'}
    ${false} | ${'/'}               | ${undefined}
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
