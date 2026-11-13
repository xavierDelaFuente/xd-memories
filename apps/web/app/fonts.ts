import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import localFont from 'next/font/local';

// Self-hosted from npm, served by the app: no font CDN request when a page opens, none at build.
// next/font sizes each fallback to its font's metrics, so text doesn't move when the font arrives.
const newsreader = localFont({
  src: [
    {
      path: '../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2',
      style: 'italic',
    },
  ],
  weight: '200 800',
  variable: '--font-newsreader',
});

// Each sets a CSS variable on <html>; globals.css maps them onto the type roles.
export const fontVariables = [GeistSans.variable, GeistMono.variable, newsreader.variable].join(
  ' ',
);
