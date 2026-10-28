import { MEDIA_TYPES } from '@xd-memories/domain';
import { z } from 'zod';

export const CatalogSearchQuery = z.object({
  mediaType: z.enum(MEDIA_TYPES),
  query: z.string().trim().min(1),
});
