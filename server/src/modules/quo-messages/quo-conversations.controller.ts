/**
 * Quo Conversations Controller
 * 
 * HTTP handlers for Quo conversations endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { quoApiClient } from '../../libs/quo-api.js';
import logger from '../../libs/logger.js';
import type { GetConversationsResponse } from '../../types/quo-api.types.js';

/**
 * Query parameters for getting conversations
 */
interface GetConversationsQuery {
    phoneNumberId?: string;
    maxResults?: number;
    pageToken?: string;
}

/**
 * Quo Conversations Controller
 */
export class QuoConversationsController {
    /**
     * Get conversations
     * 
     * GET /api/v1/conversations
     */
    async getConversations(
        request: FastifyRequest<{ Querystring: GetConversationsQuery }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const { phoneNumberId, maxResults = 30, pageToken } = request.query;

            logger.info(
                { phoneNumberId, maxResults },
                'Fetching conversations from Quo API'
            );

            // Build query parameters
            const queryParams: Record<string, any> = {
                maxResults,
            };

            if (phoneNumberId) {
                queryParams['phoneNumberId'] = phoneNumberId;
            }

            if (pageToken) {
                queryParams['pageToken'] = pageToken;
            }

            // Call Quo API
            const response = await quoApiClient.get<GetConversationsResponse>(
                '/conversations',
                { params: queryParams }
            );

            logger.info(
                { count: response.data.data.length, totalItems: response.data.totalItems },
                'Successfully fetched conversations'
            );

            return reply.status(200).send({
                success: true,
                message: 'Conversations retrieved successfully',
                data: response.data,
            });
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                },
                'Error fetching conversations'
            );

            if (error.response) {
                const status = error.response.status;
                const quoError = error.response.data;

                if (status === 401) {
                    return reply.status(401).send({
                        success: false,
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Invalid API key',
                        },
                    });
                }

                if (status === 400) {
                    return reply.status(400).send({
                        success: false,
                        error: {
                            code: 'BAD_REQUEST',
                            message: quoError.message || 'Invalid request parameters',
                        },
                    });
                }

                return reply.status(status).send({
                    success: false,
                    error: {
                        code: 'QUO_API_ERROR',
                        message: quoError.message || 'Error from Quo API',
                    },
                });
            }

            return reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch conversations',
                },
            });
        }
    }
}

export const quoConversationsController = new QuoConversationsController();
