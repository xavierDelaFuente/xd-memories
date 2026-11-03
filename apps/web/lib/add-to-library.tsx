'use client';

import { STATUSES } from '@xd-memories/domain';
import { useActionState } from 'react';
import { type AddState, addToLibrary } from './library-actions';
import { STATUS_LABELS } from './library-view';

// item is the search result as the server signed it; label is how the result reads.
export function AddToLibrary({ item, label }: { item: string; label: string }) {
  const [state, action, pending] = useActionState<AddState, FormData>(addToLibrary, {
    kind: 'idle',
  });

  return (
    <form action={action}>
      <input type="hidden" name="item" value={item} />
      <select name="status" aria-label={`Status for ${label}`} defaultValue="want">
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} aria-label={`Add ${label}`}>
        Add
      </button>
      {state.kind === 'added' && <p role="status">{state.message}</p>}
      {state.kind === 'error' && <p role="alert">{state.message}</p>}
    </form>
  );
}
