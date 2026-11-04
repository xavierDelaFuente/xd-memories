'use server';

import { AddToLibraryForm, ChangeStatusForm } from '@xd-memories/contracts';
import { changeStatus, logEntry, saveWork, withUser } from '@xd-memories/db';
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
