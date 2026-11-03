import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { withRaw } from '../raw';

const Doc = withRaw(z.object({ title: z.string(), authors: z.array(z.string()).default([]) }));

describe('withRaw', () => {
  it('parses the value as the schema says', () => {
    const { value } = Doc.parse({ title: 'Dune' });

    expect(value).toEqual({ title: 'Dune', authors: [] });
  });

  it('keeps the input as it arrived: unknown fields kept, no defaults filled in', () => {
    const input = { title: 'Dune', edition_count: 81 };

    const { raw } = Doc.parse(input);

    expect(raw).toEqual({ title: 'Dune', edition_count: 81 });
  });

  it('rejects what the schema rejects, naming the field', () => {
    const parsed = z.array(Doc).safeParse([{ title: 'Dune' }, { title: 42 }]);

    expect(parsed.error?.issues.map((issue) => issue.path)).toEqual([[1, 'title']]);
  });
});
