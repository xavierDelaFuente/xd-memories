import { err, ok, type Result, type SourceError } from '@xd-memories/domain';

const retryAfterSeconds = (header: string | null): number | null =>
  header !== null && /^\d+$/.test(header) ? Number(header) : null;

function errorFor(response: Response): SourceError {
  const { status } = response;
  if (status === 401 || status === 403) return { kind: 'Unauthorized' };
  if (status === 429) {
    return {
      kind: 'RateLimited',
      retryAfterSeconds: retryAfterSeconds(response.headers.get('Retry-After')),
    };
  }
  if (status >= 400 && status <= 499) return { kind: 'RequestRejected', status };
  return { kind: 'SourceUnavailable' };
}

// The one place a source response becomes JSON or a typed SourceError; parsing the shape is the caller's job.
export async function getJson(
  fetch: typeof globalThis.fetch,
  url: URL,
  headers: Record<string, string>,
): Promise<Result<unknown, SourceError>> {
  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch {
    return err({ kind: 'SourceUnavailable' });
  }
  if (!response.ok) return err(errorFor(response));

  try {
    return ok(await response.json());
  } catch {
    return err({ kind: 'InvalidResponse', detail: 'body is not JSON' });
  }
}
