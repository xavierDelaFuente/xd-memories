import { z } from 'zod';

// Parses with schema and keeps the input as it arrived: cache-on-save stores the source's own
// payload, which zod's output is not (it drops unknown fields and fills in defaults).
export const withRaw = <T>(schema: z.ZodType<T>) =>
  z.unknown().transform((raw, ctx) => {
    const parsed = schema.safeParse(raw);
    if (parsed.success) return { value: parsed.data, raw };
    for (const { message, path } of parsed.error.issues) {
      ctx.addIssue({ code: 'custom', message, path });
    }
    return z.NEVER;
  });
