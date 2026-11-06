'use server';

import { cookies } from 'next/headers';
import { MODE_COOKIE, modeFrom } from './color-mode';

// Re-renders the page it was posted from, so the layout puts the new mode on <html>.
export async function chooseMode(form: FormData) {
  const mode = modeFrom(String(form.get('mode') ?? ''));
  const jar = await cookies();
  if (mode === 'system') jar.delete(MODE_COOKIE);
  else jar.set(MODE_COOKIE, mode, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
}
