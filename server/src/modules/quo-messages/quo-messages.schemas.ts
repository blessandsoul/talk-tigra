/**
 * Quo Messages Schemas
 * 
 * Zod validation schemas for Quo messages endpoints
 */

import { z } from 'zod';

/**
 * Get Messages Query Schema
 * 
 * Validates query parameters for GET /messages endpoint
 */
export const getMessagesQuerySchema = z.object({
    phoneNumberId: z
        .string()
        .min(1, 'phoneNumberId is required')
        .regex(/^PN(.*)$/, 'phoneNumberId must start with "PN"')
        .describe('The unique identifier of the OpenPhone number'),

    userId: z
        .string()
        .optional()
        .describe('The unique identifier of the user'),

    participants: z
        .union([
            z.string(), // Single participant
            z.array(z.string()), // Multiple participants
        ])
        .optional()
        .transform((val) => {
            // Convert single string to array for consistency
            if (typeof val === 'string') {
                return [val];
            }
            return val;
        })
        .describe('Array of phone numbers in E.164 format (optional - leave empty to get all conversations)'),

    maxResults: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe('Maximum number of results to return'),

    pageToken: z
        .string()
        .optional()
        .describe('Token for pagination'),
});

/**
 * Inferred type from schema
 */
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;

/**
 * Message Response Schema (for documentation)
 */
export const messageSchema = z.object({
    id: z.string(),
    to: z.array(z.string()),
    from: z.string(),
    text: z.string(),
    phoneNumberId: z.string(),
    direction: z.enum(['incoming', 'outgoing']),
    userId: z.string(),
    status: z.enum(['queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'received']),
    createdAt: z.string(),
    updatedAt: z.string(),
});

/**
 * Get Messages Response Schema
 */
export const getMessagesResponseSchema = z.object({
    data: z.array(messageSchema),
    totalItems: z.number(),
    nextPageToken: z.string().optional(),
});
