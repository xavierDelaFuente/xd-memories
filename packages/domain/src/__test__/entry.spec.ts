import { describe, expect, it } from 'vitest';
import { type Entry, goNumber, logStatus, STATUSES, type Status } from '../entry';

const jan = new Date('2026-01-01T10:00:00Z');
const oct = new Date('2026-10-26T10:00:00Z');

describe('STATUSES', () => {
  it('are want, doing, done and dropped, in that order', () => {
    const statuses = [...STATUSES];

    expect(statuses).toEqual(['want', 'doing', 'done', 'dropped']);
  });
});

describe('logStatus', () => {
  it('logging "done" on a work with no entries yields one entry with status done', () => {
    const history = logStatus([], { workId: 'w1', status: 'done', now: oct });

    expect(history).toEqual([{ workId: 'w1', status: 'done', at: oct }]);
  });

  it('a dropped work can be picked up again', () => {
    const history = logStatus([], { workId: 'w1', status: 'dropped', now: jan });

    const updated = logStatus(history, { workId: 'w1', status: 'doing', now: oct });

    expect(updated).toEqual([
      { workId: 'w1', status: 'dropped', at: jan },
      { workId: 'w1', status: 'doing', at: oct },
    ]);
  });

  it('a re-read appends a second entry', () => {
    const history = logStatus([], { workId: 'w1', status: 'done', now: jan });

    const updated = logStatus(history, { workId: 'w1', status: 'done', now: oct });

    expect(updated).toEqual([
      { workId: 'w1', status: 'done', at: jan },
      { workId: 'w1', status: 'done', at: oct },
    ]);
  });

  it('a re-read never mutates the history it was given', () => {
    const history = logStatus([], { workId: 'w1', status: 'done', now: jan });

    logStatus(history, { workId: 'w1', status: 'done', now: oct });

    expect(history).toHaveLength(1);
  });

  it('works on a frozen history, so it can never mutate its input', () => {
    const history: readonly Entry[] = Object.freeze([{ workId: 'w1', status: 'done', at: jan }]);

    const logging = () => logStatus(history, { workId: 'w1', status: 'done', now: oct });

    expect(logging).not.toThrow();
  });

  it('keeps entries of different works in one history, in the order they were logged', () => {
    const first = logStatus([], { workId: 'w1', status: 'done', now: jan });

    const history = logStatus(first, { workId: 'w2', status: 'done', now: oct });

    expect(history.map((entry) => entry.workId)).toEqual(['w1', 'w2']);
  });

  it('stores the time it was given, not the time it ran', () => {
    const past = new Date('1999-12-31T23:59:59Z');

    const history = logStatus([], { workId: 'w1', status: 'done', now: past });

    expect(history).toEqual([{ workId: 'w1', status: 'done', at: past }]);
  });
});

// "doing done doing" is a history of one work, oldest first.
const statuses = (history: string) =>
  history === '' ? [] : history.split(' ').map((status) => ({ status: status as Status }));

// Which go at a work its history is on: each done ends one, and a doing after it starts the next.
describe('goNumber', () => {
  it.each`
    history                       | go
    ${''}                         | ${0}
    ${'want'}                     | ${0}
    ${'doing'}                    | ${1}
    ${'doing dropped'}            | ${1}
    ${'done'}                     | ${1}
    ${'want doing done'}          | ${1}
    ${'done want'}                | ${1}
    ${'doing dropped done'}       | ${1}
    ${'doing done doing'}         | ${2}
    ${'doing done doing dropped'} | ${2}
    ${'done done'}                | ${2}
    ${'doing done doing done'}    | ${2}
    ${'done doing done doing'}    | ${3}
  `('"$history" is go $go', ({ history, go }: { history: string; go: number }) => {
    const number = goNumber(statuses(history));

    expect(number).toBe(go);
  });
});
