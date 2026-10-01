import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'xd-memories',
  description: 'Movies, series, books and music in one place.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#F7F5F1' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
