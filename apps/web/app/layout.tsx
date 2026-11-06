import '@asnewyla/tokens/tokens.css';
import '@asnewyla/tokens/theme-terra.css';
import '@asnewyla/button/styles.css';
import '@asnewyla/input/styles.css';
import '@asnewyla/layout/styles.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'xd-memories',
  description: 'Movies, series, books and music in one place.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#F7F5F1' };

// The theme is set here, in the server-rendered HTML, not by ThemeProvider: that sets it in an
// effect, after the first paint. No data-mode, so the theme follows the system's light or dark.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="terra">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
