export const MODES = ['system', 'light', 'dark'] as const;
export type Mode = (typeof MODES)[number];

export const MODE_COOKIE = 'mode';

// The cookie comes from the browser: anything but light or dark follows the system.
export function modeFrom(cookie: string | undefined): Mode {
  return cookie === 'light' || cookie === 'dark' ? cookie : 'system';
}
