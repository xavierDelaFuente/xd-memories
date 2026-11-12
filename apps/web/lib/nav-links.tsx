'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navLinks } from './nav';

// A client component only to know the current path: the layout, a server component, doesn't.
export function NavLinks({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul>
        {navLinks(signedIn, pathname).map(({ href, label, current }) => (
          <li key={href}>
            <Link href={href} aria-current={current ? 'page' : undefined}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
