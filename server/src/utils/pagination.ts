/**
 * Pagination Utilities
 * 
 * Unified pagination response format for all paginated API endpoints.
 * This ensures consistent pagination structure across the entire API.
 * 
 * @see /mnt/project/04-pagination.md
 */

/**
 * Pagination metadata structure
 * 
 * MANDATORY format - DO NOT modify
 */
export interface PaginationMeta {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
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
        pagination: PaginationMeta;
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
 * // In controller
 * const { items, totalItems } = await resourceService.getResources(filters, page, limit);
 * return reply.send(
 *   paginatedResponse('Resources retrieved successfully', items, page, limit, totalItems)
 * );
 * 
 * @example
 * // Response format
 * {
 *   "success": true,
 *   "message": "Resources retrieved successfully",
 *   "data": {
 *     "items": [...],
 *     "pagination": {
 *       "page": 2,
 *       "limit": 10,
 *       "totalItems": 237,
 *       "totalPages": 24,
 *       "hasNextPage": true,
 *       "hasPreviousPage": true
 *     }
 *   }
 * }
 */
export function paginatedResponse<T = any>(
    message: string,
    items: T[],
    page: number,
    limit: number,
    totalItems: number
): PaginatedResponse<T> {
    // Calculate total pages (always round up)
    const totalPages = Math.ceil(totalItems / limit);

    // Calculate navigation flags
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

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
                hasNextPage,
                hasPreviousPage,
            },
        },
    };
}

/**
 * Calculates offset for database queries
 * 
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset value for database skip/offset
 * 
 * @example
 * const offset = calculateOffset(page, limit);
 * const items = await prisma.resource.findMany({
 *   skip: offset,
 *   take: limit,
 * });
 */
export function calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
}
