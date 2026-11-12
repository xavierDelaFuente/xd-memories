import '@asnewyla/tokens/tokens.css';
import '@asnewyla/tokens/theme-terra.css';
import '@asnewyla/button/styles.css';
import '@asnewyla/input/styles.css';
import '@asnewyla/layout/styles.css';
import '@asnewyla/toggle-group/styles.css';
import '@asnewyla/alert/styles.css';
import '@asnewyla/card/styles.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { currentSession } from '../lib/auth';
import { MODE_COOKIE, modeFrom } from '../lib/color-mode';
import { ModeToggle } from '../lib/mode-toggle';
import { NavLinks } from '../lib/nav-links';

export const metadata: Metadata = {
  title: 'xd-memories',
  description: 'Movies, series, books and music in one place.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#F7F5F1' };

// Theme and mode are set here, in the server-rendered HTML, not by ThemeProvider: that sets them
// in an effect, after the first paint. Without a chosen mode, the system's light or dark applies.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const mode = modeFrom((await cookies()).get(MODE_COOKIE)?.value);
  const signedIn = (await currentSession()) !== null;

  return (
    <html lang="en" data-theme="terra" data-mode={mode === 'system' ? undefined : mode}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header>
          <Link href="/" className="brand">
            xd-memories
          </Link>
          <NavLinks signedIn={signedIn} />
          <ModeToggle mode={mode} />
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
