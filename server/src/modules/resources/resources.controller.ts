/**
 * Resources Controller
 * 
 * HTTP request handlers for resources endpoints.
 * Controllers should ONLY handle HTTP concerns, no business logic.
 * 
 * @see /mnt/project/02-general-rules.md
 * @see /mnt/project/04-pagination.md
 * @see /mnt/project/06-response-handling.md
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { successResponse } from '../../utils/response.js';
import { paginatedResponse } from '../../utils/pagination.js';
import * as resourceService from './resources.service.js';
import {
    CreateResourceSchema,
    UpdateResourceSchema,
    ResourceFiltersSchema,
    PaginationSchema,
} from './resources.schemas.js';
import type {
    CreateResourceInput,
    UpdateResourceInput,
    ResourceFiltersInput,
    PaginationInput,
} from './resources.schemas.js';

/**
 * List resources with filters and pagination
 * 
 * @route GET /resources
 * @access Public
 */
export async function listResources(
    request: FastifyRequest<{
        Querystring: ResourceFiltersInput & PaginationInput;
    }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    // Parse and validate query parameters
    const filters = ResourceFiltersSchema.parse({
        status: request.query.status,
        minPrice: request.query.minPrice,
        maxPrice: request.query.maxPrice,
        ownerId: request.query.ownerId,
        search: request.query.search,
    });

    const pagination = PaginationSchema.parse({
        page: request.query.page,
        limit: request.query.limit,
    });

    // Call service
    const { items, totalItems } = await resourceService.getResources(
        filters,
        pagination.page,
        pagination.limit
    );

    // Return paginated response (EXACT format from 04-pagination.md)
    return reply.status(200).send(
        paginatedResponse(
            'Resources retrieved successfully',
            items,
            pagination.page,
            pagination.limit,
            totalItems
        )
    );
}

/**
 * Get resource by ID
 * 
 * @route GET /resources/:id
 * @access Public
 */
export async function getResource(
    request: FastifyRequest<{
        Params: { id: string };
    }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    const { id } = request.params;

    // Call service
    const resource = await resourceService.getResource(id);

    // Return success response
    return reply.status(200).send(
        successResponse('Resource retrieved successfully', resource)
    );
}

/**
 * Create a new resource
 * 
 * @route POST /resources
 * @access Private (requires authentication)
 */
export async function createResource(
    request: FastifyRequest<{
        Body: CreateResourceInput;
    }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    // Validate request body
    const body = CreateResourceSchema.parse(request.body);

    // Get user ID from authenticated request
    const userId = (request.user as any)?.userId;

    // Call service
    const resource = await resourceService.createResource(body, userId);

    // Return success response
    return reply.status(201).send(
        successResponse('Resource created successfully', resource)
    );
}

/**
 * Update a resource
 * 
 * @route PATCH /resources/:id
 * @access Private (requires authentication and ownership)
 */
export async function updateResource(
    request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateResourceInput;
    }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    const { id } = request.params;

    // Validate request body
    const body = UpdateResourceSchema.parse(request.body);

    // Get user ID from authenticated request
    const userId = (request.user as any)?.userId;

    // Call service (includes ownership verification)
    const resource = await resourceService.updateResource(id, userId, body);

    // Return success response
    return reply.status(200).send(
        successResponse('Resource updated successfully', resource)
    );
}

/**
 * Delete a resource
 * 
 * @route DELETE /resources/:id
 * @access Private (requires authentication and ownership)
 */
export async function deleteResource(
    request: FastifyRequest<{
        Params: { id: string };
    }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    const { id } = request.params;

    // Get user ID from authenticated request
    const userId = (request.user as any)?.userId;

    // Call service (includes ownership verification)
    const resource = await resourceService.deleteResource(id, userId);

    // Return success response
    return reply.status(200).send(
        successResponse('Resource deleted successfully', resource)
    );
}

/**
 * Get current user's resources
 * 
 * @route GET /resources/my
 * @access Private (requires authentication)
 */
export async function getMyResources(
    request: FastifyRequest<{
        Querystring: PaginationInput;
    }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    // Parse pagination parameters
    const pagination = PaginationSchema.parse({
        page: request.query.page,
        limit: request.query.limit,
    });

    // Get user ID from authenticated request
    const userId = (request.user as any)?.userId;

    // Call service
    const { items, totalItems } = await resourceService.getMyResources(
        userId,
        pagination.page,
        pagination.limit
    );

    // Return paginated response (EXACT format from 04-pagination.md)
    return reply.status(200).send(
        paginatedResponse(
            'Your resources retrieved successfully',
            items,
            pagination.page,
            pagination.limit,
            totalItems
        )
    );
}
