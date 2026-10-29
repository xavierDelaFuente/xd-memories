export type RateLimitInput = { lastRequestAt: Date | null; now: Date; minIntervalMs?: number };

export function waitBeforeNextRequest({
  lastRequestAt,
  now,
  minIntervalMs = 1000,
}: RateLimitInput): number {
  if (lastRequestAt === null) return 0;
  const elapsed = now.getTime() - lastRequestAt.getTime();
  return Math.min(minIntervalMs, Math.max(0, minIntervalMs - elapsed));
}
