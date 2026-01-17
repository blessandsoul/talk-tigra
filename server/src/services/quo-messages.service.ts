/**
 * Quo Messages Service (Example)
 * 
 * Example service demonstrating how to use the Quo API client
 * to interact with Quo's messaging endpoints.
 * 
 * This is a template - update the endpoints and types based on
 * actual Quo API documentation.
 */

import { quoApiClient } from '../libs/quo-api.js';
import logger from '../libs/logger.js';

/**
 * Example: Quo Message Type
 * Update this based on actual Quo API response structure
 */
interface QuoMessage {
    id: string;
    phoneNumberId: string;
    direction: 'inbound' | 'outbound';
    from: string;
    to: string;
    body: string;
    createdAt: string;
    status?: string;
}

/**
 * Example: Quo Messages List Response
 * Update this based on actual Quo API response structure
 */
interface QuoMessagesResponse {
    data: QuoMessage[];
    meta?: {
        total: number;
        page: number;
        perPage: number;
    };
}

/**
 * Quo Messages Service
 * 
 * Provides methods to interact with Quo messaging API
 */
class QuoMessagesService {
    /**
     * List messages from a specific phone number
     * 
     * @param phoneNumberId - The Quo phone number ID
     * @param params - Optional query parameters (pagination, filters, etc.)
     * @returns List of messages
     * 
     * @example
     * ```typescript
     * const messages = await quoMessagesService.listMessages('pn_123456', {
     *   limit: 50,
     *   direction: 'inbound'
     * });
     * ```
     */
    async listMessages(
        phoneNumberId: string,
        params?: {
            limit?: number;
            offset?: number;
            direction?: 'inbound' | 'outbound';
            startDate?: string;
            endDate?: string;
        }
    ): Promise<QuoMessage[]> {
        try {
            logger.info({ phoneNumberId, params }, 'Fetching messages from Quo API');

            // Example endpoint - update based on actual Quo API documentation
            const response = await quoApiClient.get<QuoMessagesResponse>(
                `/phone-numbers/${phoneNumberId}/messages`,
                { params }
            );

            logger.info(
                { count: response.data.data.length },
                'Successfully fetched messages from Quo API'
            );

            return response.data.data;
        } catch (error) {
            logger.error({ error, phoneNumberId }, 'Failed to fetch messages from Quo API');
            throw error;
        }
    }

    /**
     * Get a specific message by ID
     * 
     * @param messageId - The message ID
     * @returns Message details
     */
    async getMessage(messageId: string): Promise<QuoMessage> {
        try {
            logger.info({ messageId }, 'Fetching message from Quo API');

            // Example endpoint - update based on actual Quo API documentation
            const response = await quoApiClient.get<{ data: QuoMessage }>(
                `/messages/${messageId}`
            );

            return response.data.data;
        } catch (error) {
            logger.error({ error, messageId }, 'Failed to fetch message from Quo API');
            throw error;
        }
    }

    /**
     * Send a message
     * 
     * @param data - Message data
     * @returns Sent message details
     */
    async sendMessage(data: {
        phoneNumberId: string;
        to: string;
        body: string;
    }): Promise<QuoMessage> {
        try {
            logger.info({ to: data.to }, 'Sending message via Quo API');

            // Example endpoint - update based on actual Quo API documentation
            const response = await quoApiClient.post<{ data: QuoMessage }>(
                `/phone-numbers/${data.phoneNumberId}/messages`,
                {
                    to: data.to,
                    body: data.body,
                }
            );

            logger.info({ messageId: response.data.data.id }, 'Message sent successfully');

            return response.data.data;
        } catch (error) {
            logger.error({ error, to: data.to }, 'Failed to send message via Quo API');
            throw error;
        }
    }

    /**
     * List all phone numbers
     * 
     * @returns List of phone numbers
     */
    async listPhoneNumbers(): Promise<any[]> {
        try {
            logger.info('Fetching phone numbers from Quo API');

            // Example endpoint - update based on actual Quo API documentation
            const response = await quoApiClient.get<{ data: any[] }>('/phone-numbers');

            logger.info(
                { count: response.data.data.length },
                'Successfully fetched phone numbers from Quo API'
            );

            return response.data.data;
        } catch (error) {
            logger.error({ error }, 'Failed to fetch phone numbers from Quo API');
            throw error;
        }
    }
}

/**
 * Singleton instance of Quo Messages Service
 * 
 * Import and use this in your controllers:
 * ```typescript
 * import { quoMessagesService } from '@/services/quo-messages.service.js';
 * 
 * const messages = await quoMessagesService.listMessages('pn_123456');
 * ```
 */
export const quoMessagesService = new QuoMessagesService();

/**
 * Export the class for testing purposes
 */
export { QuoMessagesService };

/**
 * Export types
 */
export type { QuoMessage, QuoMessagesResponse };
