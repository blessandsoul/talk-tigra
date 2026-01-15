/**
 * Authentication Routes
 *
 * Fastify route definitions for authentication endpoints.
 * Includes rate limiting for security.
 *
 * @see /mnt/project/11-rate-limiting-v2.md
 */

import type { FastifyInstance } from 'fastify';
import * as authController from './auth.controller.js';

/**
 * Register authentication routes
 * 
 * @param fastify - Fastify instance
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * POST /auth/register
     *
     * Register a new user account
     */
    fastify.post('/register', {
        config: {
            rateLimit: {
                max: 3,
                timeWindow: '1 hour',
            },
        },
        handler: authController.register,
    });

    /**
     * POST /auth/login
     *
     * Login with email and password
     */
    fastify.post('/login', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '15 minutes',
            },
        },
        handler: authController.login,
    });

    /**
     * POST /auth/refresh
     *
     * Refresh access token using refresh token
     */
    fastify.post('/refresh', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '15 minutes',
            },
        },
        handler: authController.refreshTokens,
    });

    /**
     * POST /auth/logout
     *
     * Logout user by invalidating refresh token
     */
    fastify.post('/logout', {
        handler: authController.logout,
    });

    /**
     * GET /auth/me
     *
     * Get current authenticated user information
     * Requires authentication
     */
    fastify.get('/me', {
        preHandler: [fastify.authenticate],
        handler: authController.getMe,
    });
}
