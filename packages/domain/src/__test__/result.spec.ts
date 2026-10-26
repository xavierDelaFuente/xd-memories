import { describe, expect, it } from 'vitest';
import { err, ok, type Result } from '../result';

describe('Result', () => {
  it('ok wraps a value', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });

  it('err wraps an error', () => {
    expect(err({ kind: 'Nope' })).toEqual({ ok: false, error: { kind: 'Nope' } });
  });

  it('checking ok narrows to the value or the error', () => {
    const results: Result<number, string>[] = [ok(1), err('bad')];

    const described = results.map((result) => (result.ok ? result.value * 2 : result.error));

    expect(described).toEqual([2, 'bad']);
  });
});
