/**
 * Quo Messages Service
 * 
 * Service for interacting with Quo (OpenPhone) messages API
 */

import { quoApiClient } from '../../libs/quo-api.js';
import logger from '../../libs/logger.js';
import type { GetMessagesResponse, GetMessagesParams } from '../../types/quo-api.types.js';

/**
 * Quo Messages Service Class
 */
class QuoMessagesService {
    /**
     * Get messages from Quo API
     * 
     * @param params - Query parameters for filtering messages
     * @returns Messages response from Quo API
     */
    async getMessages(params: GetMessagesParams): Promise<GetMessagesResponse> {
        try {
            logger.info(
                {
                    phoneNumberId: params.phoneNumberId,
                    maxResults: params.maxResults
                },
                'Fetching messages from Quo API'
            );

            // Build query parameters
            const queryParams: Record<string, any> = {
                phoneNumberId: params.phoneNumberId,
                maxResults: params.maxResults || 10,
            };

            // Add optional parameters
            if (params['userId']) {
                queryParams.userId = params['userId'];
            }

            if (params['participants'] && params['participants'].length > 0) {
                queryParams.participants = params['participants'];
            }

            if (params['pageToken']) {
                queryParams.pageToken = params['pageToken'];
            }

            // Make request to Quo API
            const response = await quoApiClient.get<GetMessagesResponse>(
                '/messages',
                { params: queryParams }
            );

            logger.info(
                {
                    totalItems: response.data.totalItems,
                    itemsReturned: response.data.data.length
                },
                'Successfully fetched messages from Quo API'
            );

            return response.data;
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    phoneNumberId: params.phoneNumberId,
                    status: error.response?.status,
                    data: error.response?.data,
                },
                'Failed to fetch messages from Quo API'
            );

            // Re-throw with more context
            throw error;
        }
    }
}

/**
 * Singleton instance
 */
export const quoMessagesService = new QuoMessagesService();

/**
 * Export class for testing
 */
export { QuoMessagesService };
