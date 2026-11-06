'use client';

// The design system (@asnewyla/*), usable from server components too. Its packages don't mark
// themselves as client code, but Button and Input hold React context, which Next.js allows only
// in client components; re-exported from here, they become client references.
export { Button } from '@asnewyla/button';
export { Input } from '@asnewyla/input';
export { Group, Stack } from '@asnewyla/layout';
