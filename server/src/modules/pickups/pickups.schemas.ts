/**
 * Pickups Schemas
 *
 * Zod validation schemas for pickup endpoints
 */

import { z } from 'zod';

export const updateNotesSchema = z.object({
    notes: z.string().max(1000).nullable(),
});

export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
