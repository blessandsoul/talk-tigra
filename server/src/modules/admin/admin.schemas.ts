/**
 * Admin Module Validation Schemas
 */

import { z } from 'zod';

/**
 * List users query parameters
 */
export const ListUsersSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListUsersInput = z.infer<typeof ListUsersSchema>;

/**
 * User ID parameter
 */
export const UserIdSchema = z.object({
    id: z.string().uuid('Invalid user ID format'),
});

export type UserIdInput = z.infer<typeof UserIdSchema>;

/**
 * Change role request body
 */
export const ChangeRoleSchema = z.object({
    role: z.enum(['USER', 'ADMIN'], {
        errorMap: () => ({ message: 'Role must be USER or ADMIN' }),
    }),
});

export type ChangeRoleInput = z.infer<typeof ChangeRoleSchema>;
