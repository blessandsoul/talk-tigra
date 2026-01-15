/**
 * Response Utilities
 * 
 * Unified success response format for all API endpoints.
 * This ensures consistent response structure across the entire API.
 * 
 * @see /mnt/project/06-response-handling.md
 * @see /mnt/project/04-pagination.md
 */

/**
 * Success response structure
 * 
 * MANDATORY format - DO NOT modify
 */
export interface SuccessResponse<T = any> {
    success: true;
    message: string;
    data: T;
}

/**
 * Paginated response structure
 * 
 * MANDATORY format - DO NOT modify
 */
export interface PaginatedResponse<T = any> {
    success: true;
    message: string;
    data: {
        items: T[];
        pagination: {
            page: number;
            limit: number;
            totalItems: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    };
}

/**
 * Creates a standardized success response
 * 
 * @param message - Human-readable success message
 * @param data - Response payload (object, array, or null)
 * @returns Standardized success response object
 * 
 * @example
 * // Simple success
 * return reply.send(successResponse('User created successfully', user));
 * 
 * @example
 * // With null data
 * return reply.send(successResponse('Deleted successfully', null));
 * 
 * @example
 * // With array data
 * return reply.send(successResponse('Users retrieved', users));
 */
export function successResponse<T = any>(
    message: string,
    data: T
): SuccessResponse<T> {
    return {
        success: true,
        message,
        data,
    };
}

/**
 * Creates a standardized paginated response
 * 
 * @param message - Human-readable success message
 * @param items - Array of items for current page
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param totalItems - Total count of items across all pages
 * @returns Standardized paginated response object
 * 
 * @example
 * return reply.send(paginatedResponse('Users retrieved', users, 1, 10, 237));
 */
export function paginatedResponse<T = any>(
    message: string,
    items: T[],
    page: number,
    limit: number,
    totalItems: number
): PaginatedResponse<T> {
    const totalPages = Math.ceil(totalItems / limit);

    return {
        success: true,
        message,
        data: {
            items,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        },
    };
}
