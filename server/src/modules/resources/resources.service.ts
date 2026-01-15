/**
 * Resources Service
 * 
 * Business logic for resources operations.
 * Handles CRUD operations with authorization checks.
 * 
 * @see /mnt/project/02-general-rules.md
 */

import logger from '../../libs/logger.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import * as resourceRepo from './resources.repo.js';
import type { ResourceFilters, Resource, ResourceWithOwner } from './resources.types.js';
import type { CreateResourceInput, UpdateResourceInput } from './resources.schemas.js';

/**
 * Service response for paginated data
 */
interface PaginatedResult<T> {
    items: T[];
    totalItems: number;
}

/**
 * Get resources with filters and pagination
 * 
 * @param filters - Filter criteria
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Items and total count
 */
export async function getResources(
    filters: ResourceFilters,
    page: number,
    limit: number
): Promise<PaginatedResult<Resource>> {
    try {
        // Get items with filters and pagination
        const items = await resourceRepo.findMany(filters, page, limit);

        // Get total count with same filters
        const totalItems = await resourceRepo.count(filters);

        logger.info(
            { filters, page, limit, count: items.length, totalItems },
            'Resources retrieved'
        );

        return { items, totalItems };
    } catch (error) {
        logger.error({ error, filters, page, limit }, 'Failed to get resources');
        throw error;
    }
}

/**
 * Get resource by ID
 * 
 * @param id - Resource ID
 * @returns Resource with owner relation
 * @throws NotFoundError if resource not found
 */
export async function getResource(id: string): Promise<ResourceWithOwner> {
    try {
        const resource = await resourceRepo.findById(id);

        if (!resource) {
            throw new NotFoundError('Resource not found');
        }

        logger.info({ resourceId: id }, 'Resource retrieved');

        return resource;
    } catch (error) {
        logger.error({ error, resourceId: id }, 'Failed to get resource');
        throw error;
    }
}

/**
 * Create a new resource
 * 
 * @param data - Resource creation data
 * @param userId - Owner user ID
 * @returns Created resource
 */
export async function createResource(
    data: CreateResourceInput,
    userId: string
): Promise<Resource> {
    try {
        const resource = await resourceRepo.create(data, userId);

        logger.info(
            { resourceId: resource.id, userId, title: resource.title },
            'Resource created'
        );

        return resource;
    } catch (error) {
        logger.error({ error, userId, data }, 'Failed to create resource');
        throw error;
    }
}

/**
 * Update a resource
 * 
 * @param id - Resource ID
 * @param userId - User ID (for ownership verification)
 * @param data - Update data
 * @returns Updated resource
 * @throws NotFoundError if resource not found
 * @throws ForbiddenError if user is not the owner
 */
export async function updateResource(
    id: string,
    userId: string,
    data: UpdateResourceInput
): Promise<Resource> {
    try {
        // Check if resource exists
        const exists = await resourceRepo.exists(id);
        if (!exists) {
            throw new NotFoundError('Resource not found');
        }

        // Verify ownership
        const isOwner = await resourceRepo.isOwner(id, userId);
        if (!isOwner) {
            throw new ForbiddenError('You do not have permission to update this resource');
        }

        // Update resource
        const resource = await resourceRepo.update(id, data);

        logger.info(
            { resourceId: id, userId, updates: Object.keys(data) },
            'Resource updated'
        );

        return resource;
    } catch (error) {
        logger.error({ error, resourceId: id, userId, data }, 'Failed to update resource');
        throw error;
    }
}

/**
 * Delete a resource (soft delete)
 * 
 * @param id - Resource ID
 * @param userId - User ID (for ownership verification)
 * @returns Deleted resource
 * @throws NotFoundError if resource not found
 * @throws ForbiddenError if user is not the owner
 */
export async function deleteResource(
    id: string,
    userId: string
): Promise<Resource> {
    try {
        // Check if resource exists
        const exists = await resourceRepo.exists(id);
        if (!exists) {
            throw new NotFoundError('Resource not found');
        }

        // Verify ownership
        const isOwner = await resourceRepo.isOwner(id, userId);
        if (!isOwner) {
            throw new ForbiddenError('You do not have permission to delete this resource');
        }

        // Soft delete resource
        const resource = await resourceRepo.deleteResource(id);

        logger.info({ resourceId: id, userId }, 'Resource deleted');

        return resource;
    } catch (error) {
        logger.error({ error, resourceId: id, userId }, 'Failed to delete resource');
        throw error;
    }
}

/**
 * Get user's resources
 * 
 * @param userId - User ID
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns User's resources and total count
 */
export async function getMyResources(
    userId: string,
    page: number,
    limit: number
): Promise<PaginatedResult<Resource>> {
    try {
        // Filter by owner ID
        const filters: ResourceFilters = { ownerId: userId };

        // Get items and count
        const items = await resourceRepo.findMany(filters, page, limit);
        const totalItems = await resourceRepo.count(filters);

        logger.info(
            { userId, page, limit, count: items.length, totalItems },
            'User resources retrieved'
        );

        return { items, totalItems };
    } catch (error) {
        logger.error({ error, userId, page, limit }, 'Failed to get user resources');
        throw error;
    }
}
