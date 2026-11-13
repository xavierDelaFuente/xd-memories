'use client';

import { Alert } from '@asnewyla/alert';
import { Button } from '@asnewyla/button';
import { ButtonGroup } from '@asnewyla/button-group';
import type { MediaType } from '@xd-memories/domain';
import { useActionState } from 'react';
import { type AddState, addToLibrary } from './library-actions';
import { ADD_STATUSES, statusLabel } from './library-view';

// item is the search result as the server signed it; label is how the result reads.
// One tap adds it: each status is a submit button, and the one pressed posts its status.
export function AddToLibrary({
  item,
  label,
  mediaType,
}: {
  item: string;
  label: string;
  mediaType: MediaType;
}) {
  const [state, action, pending] = useActionState<AddState, FormData>(addToLibrary, {
    kind: 'idle',
  });

  return (
    <form action={action} className="add">
      <input type="hidden" name="item" value={item} />
      {/* The group's name already says "Add …" to a screen reader. */}
      <span aria-hidden="true">Add as</span>
      <ButtonGroup aria-label={`Add ${label}`} variant="outline" size="sm" disabled={pending}>
        {ADD_STATUSES.map((status) => (
          <Button key={status} type="submit" name="status" value={status}>
            {statusLabel(status, mediaType)}
          </Button>
        ))}
      </ButtonGroup>
      {state.kind === 'added' && <Alert tone="success">{state.message}</Alert>}
      {state.kind === 'error' && <Alert tone="error">{state.message}</Alert>}
    </form>
  );
}
