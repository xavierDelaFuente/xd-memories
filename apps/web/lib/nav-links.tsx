'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navLinks } from './nav';

// A client component only to know the current path: the layout, a server component, doesn't.
export function NavLinks({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="main-nav">
      <ul>
        {navLinks(signedIn, pathname).map(({ href, label, current, phoneOnly }) => (
          <li key={href} className={phoneOnly ? 'phone-only' : undefined}>
            <Link href={href} aria-current={current ? 'page' : undefined}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
