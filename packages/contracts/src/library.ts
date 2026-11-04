import { MEDIA_TYPES, STATUSES } from '@xd-memories/domain';
import { z } from 'zod';

// A catalog item as it travels inside a signed search result (apps/web lib/signed-item).
export const CatalogItemShape = z.object({
  ref: z.object({ source: z.string().min(1), externalId: z.string().min(1) }),
  mediaType: z.enum(MEDIA_TYPES),
  title: z.string().trim().min(1),
  creators: z.array(z.string()),
  year: z.int().nullable(),
  sourceVersion: z.string().min(1),
  raw: z.unknown(),
});

// "Add" on a search result: the signed item, and the status to start it with.
export const AddToLibraryForm = z.object({
  item: z.string().min(1),
  status: z.enum(STATUSES),
});

// A new status for a work already in the library (BACKLOG 3.7).
export const ChangeStatusForm = z.object({
  workId: z.string().min(1),
  status: z.enum(STATUSES),
});
