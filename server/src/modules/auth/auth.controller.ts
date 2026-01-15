/**
 * Authentication Controller
 * 
 * HTTP request handlers for authentication endpoints.
 * Controllers should ONLY handle HTTP concerns, no business logic.
 * 
 * @see /mnt/project/02-general-rules.md
 * @see /mnt/project/06-response-handling.md
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { successResponse } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

import * as authService from './auth.service.js';
import * as authRepo from './auth.repo.js';
import {
    RegisterSchema,
    LoginSchema,
    RefreshTokenSchema,
} from './auth.schemas.js';
import type { RegisterInput, LoginInput, RefreshTokenInput } from './auth.schemas.js';

/**
 * Register a new user
 * 
 * @route POST /auth/register
 * @access Public
 */
export async function register(
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    // Validate request body
    const body = RegisterSchema.parse(request.body);

    // Call service
    const authResponse = await authService.register(body);

    // Return success response
    return reply.status(201).send(
        successResponse('User registered successfully', authResponse)
    );
}

/**
 * Login user
 * 
 * @route POST /auth/login
 * @access Public
 */
export async function login(
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    // Validate request body
    const body = LoginSchema.parse(request.body);

    // Call service
    const authResponse = await authService.login(body);

    // Return success response
    return reply.status(200).send(
        successResponse('Login successful', authResponse)
    );
}

/**
 * Refresh access token
 * 
 * @route POST /auth/refresh
 * @access Public
 */
export async function refreshTokens(
    request: FastifyRequest<{ Body: RefreshTokenInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    // Validate request body
    const body = RefreshTokenSchema.parse(request.body);

    // Call service
    const tokens = await authService.refreshTokens(body.refreshToken);

    // Return success response
    return reply.status(200).send(
        successResponse('Tokens refreshed successfully', tokens)
    );
}

/**
 * Logout user
 * 
 * @route POST /auth/logout
 * @access Public
 */
export async function logout(
    request: FastifyRequest<{ Body: RefreshTokenInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    // Validate request body
    const body = RefreshTokenSchema.parse(request.body);

    // Call service
    await authService.logout(body.refreshToken);

    // Return success response
    return reply.status(200).send(
        successResponse('Logout successful', null)
    );
}

/**
 * Get current authenticated user
 * 
 * @route GET /auth/me
 * @access Private (requires authentication)
 */
export async function getMe(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<FastifyReply> {
    // Get user ID from authenticated request
    // Note: request.user is set by authentication middleware
    const userId = (request.user as any)?.userId;

    if (!userId) {
        throw new NotFoundError('User not found');
    }

    // Find user by ID
    const user = await authRepo.findUserById(userId);

    if (!user) {
        throw new NotFoundError('User not found');
    }

    // Return success response
    return reply.status(200).send(
        successResponse('User retrieved successfully', user)
    );
}
