import { expect, it } from 'vitest';
import { yearOf } from '../year';

it.each`
  date            | year
  ${'1999-03-31'} | ${1999}
  ${'1997-05'}    | ${1997}
  ${'1965'}       | ${1965}
  ${''}           | ${null}
  ${undefined}    | ${null}
  ${'soon'}       | ${null}
  ${'99-03-31'}   | ${null}
`(
  '$date is the year $year',
  ({ date, year }: { date: string | undefined; year: number | null }) => {
    const result = yearOf(date);

    expect(result).toBe(year);
  },
);
