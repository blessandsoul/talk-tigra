/**
 * Resources Types
 * 
 * TypeScript types and interfaces for resources module.
 * Resources are the main CRUD entity in this application.
 */

/**
 * Resource Status Enum
 */
export type ResourceStatus = 'active' | 'inactive' | 'deleted';

/**
 * Resource object
 * 
 * Main entity representing a resource in the system.
 */
export interface Resource {
    id: string;
    ownerId: string;
    title: string;
    summary: string | null;
    price: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create Resource Request Payload
 */
export interface CreateResourceRequest {
    title: string;
    summary?: string;
    price: number;
}

/**
 * Update Resource Request Payload
 * 
 * All fields are optional (partial update)
 */
export interface UpdateResourceRequest {
    title?: string;
    summary?: string;
    price?: number;
}

/**
 * Resource Filters
 * 
 * Used for filtering and searching resources.
 */
export interface ResourceFilters {
    status?: ResourceStatus;
    minPrice?: number;
    maxPrice?: number;
    ownerId?: string;
    search?: string; // Search in title
}

/**
 * Resource with Owner
 * 
 * Resource with owner relation populated.
 */
export interface ResourceWithOwner extends Resource {
    owner: {
        id: string;
        email: string;
        name: string | null;
    };
}
