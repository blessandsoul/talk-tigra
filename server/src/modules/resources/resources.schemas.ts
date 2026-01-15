/**
 * Resources Schemas
 * 
 * Zod schemas for request validation and type validation.
 * Ensures type safety and API documentation consistency.
 */

import { z } from 'zod';

/**
 * Create Resource Schema
 * 
 * Validates resource creation requests.
 */
export const CreateResourceSchema = z.object({
    title: z
        .string()
        .min(1, 'Title is required')
        .max(200, 'Title must not exceed 200 characters')
        .trim(),
    summary: z
        .string()
        .max(1000, 'Summary must not exceed 1000 characters')
        .trim()
        .optional(),
    price: z
        .number()
        .positive('Price must be positive')
        .multipleOf(0.01, 'Price can have at most 2 decimal places')
        .max(999999.99, 'Price is too large'),
});

/**
 * Update Resource Schema
 * 
 * Validates resource update requests.
 * All fields are optional (partial update).
 */
export const UpdateResourceSchema = z.object({
    title: z
        .string()
        .min(1, 'Title cannot be empty')
        .max(200, 'Title must not exceed 200 characters')
        .trim()
        .optional(),
    summary: z
        .string()
        .max(1000, 'Summary must not exceed 1000 characters')
        .trim()
        .optional(),
    price: z
        .number()
        .positive('Price must be positive')
        .multipleOf(0.01, 'Price can have at most 2 decimal places')
        .max(999999.99, 'Price is too large')
        .optional(),
});

/**
 * Resource Filters Schema
 * 
 * Validates query parameters for filtering resources.
 */
export const ResourceFiltersSchema = z.object({
    status: z
        .enum(['active', 'inactive', 'deleted'])
        .optional(),
    minPrice: z
        .coerce
        .number()
        .positive('Minimum price must be positive')
        .optional(),
    maxPrice: z
        .coerce
        .number()
        .positive('Maximum price must be positive')
        .optional(),
    ownerId: z
        .string()
        .uuid('Invalid owner ID format')
        .optional(),
    search: z
        .string()
        .trim()
        .optional(),
});

/**
 * Pagination Schema
 * 
 * Validates pagination query parameters.
 */
export const PaginationSchema = z.object({
    page: z
        .coerce
        .number()
        .int()
        .min(1, 'Page must be at least 1')
        .default(1),
    limit: z
        .coerce
        .number()
        .int()
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit must not exceed 100')
        .default(10),
});

/**
 * Resource Response Schema (for type validation)
 * 
 * Defines the structure of resource objects in API responses.
 */
export const ResourceResponseSchema = z.object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    title: z.string(),
    summary: z.string().nullable(),
    price: z.number(),
    status: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

/**
 * Resource with Owner Response Schema (for type validation)
 */
export const ResourceWithOwnerResponseSchema = ResourceResponseSchema.extend({
    owner: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string().nullable(),
    }),
});

/**
 * Type inference from schemas
 * 
 * These types can be used in controllers and services.
 */
export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;
export type ResourceFiltersInput = z.infer<typeof ResourceFiltersSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type ResourceResponse = z.infer<typeof ResourceResponseSchema>;
export type ResourceWithOwnerResponse = z.infer<typeof ResourceWithOwnerResponseSchema>;
