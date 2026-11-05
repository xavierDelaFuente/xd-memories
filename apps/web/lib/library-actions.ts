'use server';

import {
  AddToLibraryForm,
  ChangeStatusForm,
  HighlightForm,
  RateForm,
  SeasonForm,
} from '@xd-memories/contracts';
import {
  changeStatus,
  highlight,
  logEntry,
  rate,
  reachSeason,
  saveWork,
  unhighlight,
  withUser,
} from '@xd-memories/db';
import { createRating } from '@xd-memories/domain';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { appSecret, currentSession, getDb } from './auth';
import { STATUS_LABELS } from './library-view';
import { verifyItem } from './signed-item';

export type AddState =
  | { kind: 'idle' }
  | { kind: 'added'; message: string }
  | { kind: 'error'; message: string };

const MESSAGES = {
  Invalid: 'This result can’t be added. Search again and retry.',
  Expired: 'This result is out of date. Search again and retry.',
} as const;

export async function addToLibrary(_: AddState, form: FormData): Promise<AddState> {
  const session = await currentSession();
  if (!session) redirect('/sign-in');

  const parsed = AddToLibraryForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { kind: 'error', message: MESSAGES.Invalid };
  const now = new Date();
  const verified = verifyItem(parsed.data.item, { secret: appSecret(), now });
  if (!verified.ok) return { kind: 'error', message: MESSAGES[verified.error.kind] };

  const { status } = parsed.data;
  await withUser(getDb(), session.user.id, async (trx) => {
    const workId = await saveWork(trx, verified.value);
    await logEntry(trx, { workId, status, at: now });
  });
  return { kind: 'added', message: `Added to your library as ${STATUS_LABELS[status]}.` };
}

// From /library. A work not in this user's library is left alone (changeStatus checks), so a
// crafted form changes nothing; the page simply shows the library as it is.
export async function updateStatus(form: FormData): Promise<void> {
  const session = await currentSession();
  if (!session) redirect('/sign-in');

  const parsed = ChangeStatusForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const { workId, status } = parsed.data;
  await withUser(getDb(), session.user.id, (trx) =>
    changeStatus(trx, { workId, status, at: new Date() }),
  );
  revalidatePath('/library');
}

// From /library, like updateStatus: a rating outside 0–100, or for a work not in this user's
// library (rate checks), changes nothing.
export async function updateRating(form: FormData): Promise<void> {
  const session = await currentSession();
  if (!session) redirect('/sign-in');

  const parsed = RateForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const rating = createRating(parsed.data.rating);
  if (!rating.ok) return;
  const { workId } = parsed.data;
  await withUser(getDb(), session.user.id, (trx) => rate(trx, { workId, rating: rating.value }));
  revalidatePath('/library');
}

// From /library, like updateStatus: reachSeason checks the work is a series in this user's library.
export async function updateSeason(form: FormData): Promise<void> {
  const session = await currentSession();
  if (!session) redirect('/sign-in');

  const parsed = SeasonForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const { workId, season } = parsed.data;
  await withUser(getDb(), session.user.id, (trx) => reachSeason(trx, { workId, season }));
  revalidatePath('/library');
}

// From /library: show a work on your profile, or stop. highlight checks the work is in this
// user's library; unhighlight can only remove their own.
async function changeHighlight(form: FormData, change: typeof highlight) {
  const session = await currentSession();
  if (!session) redirect('/sign-in');

  const parsed = HighlightForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const { workId } = parsed.data;
  await withUser(getDb(), session.user.id, (trx) => change(trx, workId));
  revalidatePath('/library');
  revalidatePath(`/people/${session.user.id}`);
}

export async function addHighlight(form: FormData): Promise<void> {
  await changeHighlight(form, highlight);
}

export async function removeHighlight(form: FormData): Promise<void> {
  await changeHighlight(form, unhighlight);
}
