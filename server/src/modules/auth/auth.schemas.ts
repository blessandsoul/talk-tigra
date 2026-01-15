/**
 * Authentication Schemas
 *
 * Zod schemas for request validation.
 * These schemas ensure type safety and runtime validation.
 */

import { z } from 'zod';

/**
 * Password Validation Regex
 * 
 * Requirements:
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - Minimum 8 characters
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/**
 * Register Schema
 * 
 * Validates user registration requests.
 */
export const RegisterSchema = z.object({
    email: z
        .string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            passwordRegex,
            'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'
        ),
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .trim(),
});

/**
 * Login Schema
 * 
 * Validates user login requests.
 */
export const LoginSchema = z.object({
    email: z
        .string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters'),
});

/**
 * Refresh Token Schema
 * 
 * Validates refresh token requests.
 */
export const RefreshTokenSchema = z.object({
    refreshToken: z
        .string()
        .min(1, 'Refresh token is required'),
});

/**
 * User Response Schema (for type validation)
 * 
 * Defines the structure of user objects in API responses.
 */
export const UserResponseSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    role: z.enum(['USER', 'ADMIN']),
    emailVerified: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

/**
 * Token Response Schema (for type validation)
 * 
 * Defines the structure of token objects in API responses.
 */
export const TokenResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int().positive(),
});

/**
 * Auth Response Schema (for type validation)
 * 
 * Complete authentication response structure.
 * Used for login and register endpoints.
 */
export const AuthResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
        user: UserResponseSchema,
        tokens: TokenResponseSchema,
    }),
});

/**
 * Error Response Schema (for type validation)
 * 
 * Standard error response structure.
 */
export const ErrorResponseSchema = z.object({
    success: z.literal(false),
    error: z.object({
        code: z.string(),
        message: z.string(),
    }),
});

/**
 * Type inference from schemas
 * 
 * These types can be used in controllers and services.
 */
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
