export type NavLink = { href: string; label: string; current: boolean };

// phoneOnly: shown in the phone's tab bar; on a wider screen the sidebar lists the media instead.
export type MainLink = NavLink & { phoneOnly: boolean };

// A section is current on its own path and below it: /catalog/books is in Browse, /catalogue isn't.
const within = (pathname: string, section: string) =>
  pathname === section || pathname.startsWith(`${section}/`);

// Signed out, the library would only redirect to sign-in, so the nav offers that directly. For you
// is the signed-in home; only shipped sections appear (Journey, Ask and Sync come with their phases).
export function navLinks(signedIn: boolean, pathname: string): MainLink[] {
  const links = [
    ...(signedIn
      ? [{ href: '/', label: 'For you', current: pathname === '/', phoneOnly: false }]
      : []),
    {
      href: '/catalog/movies',
      label: 'Browse',
      current: within(pathname, '/catalog'),
      phoneOnly: true,
    },
    signedIn
      ? {
          href: '/library',
          label: 'Library',
          current: within(pathname, '/library'),
          phoneOnly: false,
        }
      : {
          href: '/sign-in',
          label: 'Sign in',
          current: within(pathname, '/sign-in'),
          phoneOnly: false,
        },
  ];
  return links;
}
