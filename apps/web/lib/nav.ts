export type NavLink = { href: string; label: string; current: boolean };

// A section is current on its own path and below it: /catalog/books is in Catalog, /catalogue isn't.
const within = (pathname: string, section: string) =>
  pathname === section || pathname.startsWith(`${section}/`);

// Signed out, the library would only redirect to sign-in, so the header offers that directly.
export function navLinks(signedIn: boolean, pathname: string): NavLink[] {
  const links = [
    { href: '/catalog/movies', label: 'Catalog', section: '/catalog' },
    signedIn
      ? { href: '/library', label: 'Library', section: '/library' }
      : { href: '/sign-in', label: 'Sign in', section: '/sign-in' },
  ];
  return links.map(({ href, label, section }) => ({
    href,
    label,
    current: within(pathname, section),
  }));
}
