// Sources send dates as YYYY-MM-DD, YYYY-MM or YYYY — or an empty string when unknown.
export const yearOf = (date: string | undefined): number | null => {
  const year = date?.match(/^(\d{4})(-|$)/)?.[1];
  return year === undefined ? null : Number(year);
};
