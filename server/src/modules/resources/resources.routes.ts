/**
 * Resources Routes
 *
 * Fastify route definitions for resources endpoints.
 * Includes rate limiting for security.
 *
 * @see /mnt/project/11-rate-limiting-v2.md
 */

import type { FastifyInstance } from 'fastify';
import * as resourceController from './resources.controller.js';

/**
 * Register resources routes
 *
 * @param fastify - Fastify instance
 */
export async function resourceRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * GET /resources
     *
     * Get paginated list of resources with optional filters
     */
    fastify.get('/', {
        config: {
            rateLimit: {
                max: 100,
                timeWindow: '15 minutes',
            },
        },
        handler: resourceController.listResources,
    });

    /**
     * GET /resources/my
     *
     * Get current user's resources
     * Requires authentication
     */
    fastify.get('/my', {
        config: {
            rateLimit: {
                max: 1000,
                timeWindow: '15 minutes',
            },
        },
        preHandler: [fastify.authenticate, fastify.requireAny()],
        handler: resourceController.getMyResources,
    });

    /**
     * GET /resources/:id
     *
     * Get single resource by ID with owner information
     */
    fastify.get('/:id', {
        config: {
            rateLimit: {
                max: 100,
                timeWindow: '15 minutes',
            },
        },
        handler: resourceController.getResource,
    });

    /**
     * POST /resources
     *
     * Create a new resource
     * Requires authentication
     */
    fastify.post('/', {
        config: {
            rateLimit: {
                max: 1000,
                timeWindow: '15 minutes',
            },
        },
        preHandler: [fastify.authenticate, fastify.requireAny()],
        handler: resourceController.createResource,
    });

    /**
     * PATCH /resources/:id
     *
     * Update a resource (owner only)
     * Requires authentication
     */
    fastify.patch('/:id', {
        config: {
            rateLimit: {
                max: 1000,
                timeWindow: '15 minutes',
            },
        },
        preHandler: [fastify.authenticate, fastify.requireAny()],
        handler: resourceController.updateResource,
    });

    /**
     * DELETE /resources/:id
     *
     * Delete a resource (owner only, soft delete)
     * Requires authentication
     */
    fastify.delete('/:id', {
        config: {
            rateLimit: {
                max: 1000,
                timeWindow: '15 minutes',
            },
        },
        preHandler: [fastify.authenticate, fastify.requireAny()],
        handler: resourceController.deleteResource,
    });
}
