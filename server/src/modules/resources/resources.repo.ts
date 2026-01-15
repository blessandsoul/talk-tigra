/**
 * Resources Repository
 * 
 * Database operations for resources module.
 * Handles all Prisma queries related to resources.
 * 
 * @see /mnt/project/02-general-rules.md
 */

import { prisma } from '../../libs/db.js';
import type { Resource as PrismaResource } from '@prisma/client';
import type { ResourceFilters, Resource, ResourceWithOwner } from './resources.types.js';
import type { CreateResourceInput, UpdateResourceInput } from './resources.schemas.js';

/**
 * Find many resources with filters and pagination
 * 
 * @param filters - Filter criteria
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Array of resources
 */
export async function findMany(
    filters: ResourceFilters,
    page: number,
    limit: number
): Promise<Resource[]> {
    // Build where clause
    const where: any = {};

    // Status filter
    if (filters.status) {
        where.status = filters.status;
    }

    // Price range filters
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.price = {};
        if (filters.minPrice !== undefined) {
            where.price.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
            where.price.lte = filters.maxPrice;
        }
    }

    // Owner filter
    if (filters.ownerId) {
        where.ownerId = filters.ownerId;
    }

    // Search filter (title contains)
    if (filters.search) {
        where.title = {
            contains: filters.search,
            mode: 'insensitive', // Case-insensitive search
        };
    }

    // Calculate offset
    const skip = (page - 1) * limit;

    // Execute query
    const resources = await prisma.resource.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
            createdAt: 'desc',
        },
    });

    return resources;
}

/**
 * Count resources with filters
 * 
 * @param filters - Filter criteria
 * @returns Total count of resources matching filters
 */
export async function count(filters: ResourceFilters): Promise<number> {
    // Build where clause (same as findMany)
    const where: any = {};

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.price = {};
        if (filters.minPrice !== undefined) {
            where.price.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
            where.price.lte = filters.maxPrice;
        }
    }

    if (filters.ownerId) {
        where.ownerId = filters.ownerId;
    }

    if (filters.search) {
        where.title = {
            contains: filters.search,
            mode: 'insensitive',
        };
    }

    // Execute count query
    const total = await prisma.resource.count({ where });

    return total;
}

/**
 * Find resource by ID
 * 
 * @param id - Resource ID
 * @returns Resource with owner relation, or null if not found
 */
export async function findById(id: string): Promise<ResourceWithOwner | null> {
    const resource = await prisma.resource.findUnique({
        where: { id },
        include: {
            owner: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
        },
    });

    return resource;
}

/**
 * Create a new resource
 * 
 * @param data - Resource creation data
 * @param ownerId - Owner user ID
 * @returns Created resource
 */
export async function create(
    data: CreateResourceInput,
    ownerId: string
): Promise<Resource> {
    const resource = await prisma.resource.create({
        data: {
            title: data.title,
            summary: data.summary || null,
            price: data.price,
            ownerId,
            status: 'active',
        },
    });

    return resource;
}

/**
 * Update a resource
 * 
 * @param id - Resource ID
 * @param data - Update data (partial)
 * @returns Updated resource
 */
export async function update(
    id: string,
    data: UpdateResourceInput
): Promise<Resource> {
    const resource = await prisma.resource.update({
        where: { id },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.summary !== undefined && { summary: data.summary }),
            ...(data.price !== undefined && { price: data.price }),
        },
    });

    return resource;
}

/**
 * Delete a resource (soft delete)
 * 
 * Sets status to 'deleted' instead of removing from database.
 * 
 * @param id - Resource ID
 * @returns Deleted resource
 */
export async function deleteResource(id: string): Promise<Resource> {
    const resource = await prisma.resource.update({
        where: { id },
        data: {
            status: 'deleted',
        },
    });

    return resource;
}

/**
 * Hard delete a resource
 * 
 * Permanently removes resource from database.
 * Use with caution - prefer soft delete.
 * 
 * @param id - Resource ID
 */
export async function hardDelete(id: string): Promise<void> {
    await prisma.resource.delete({
        where: { id },
    });
}

/**
 * Check if resource exists
 * 
 * @param id - Resource ID
 * @returns True if resource exists, false otherwise
 */
export async function exists(id: string): Promise<boolean> {
    const count = await prisma.resource.count({
        where: { id },
    });

    return count > 0;
}

/**
 * Check if user owns resource
 * 
 * @param resourceId - Resource ID
 * @param userId - User ID
 * @returns True if user owns resource, false otherwise
 */
export async function isOwner(
    resourceId: string,
    userId: string
): Promise<boolean> {
    const count = await prisma.resource.count({
        where: {
            id: resourceId,
            ownerId: userId,
        },
    });

    return count > 0;
}
