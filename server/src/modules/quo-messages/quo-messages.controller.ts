/**
 * Quo Messages Controller
 * 
 * HTTP handlers for Quo messages endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { quoMessagesService } from './quo-messages.service.js';
import { getMessagesQuerySchema, type GetMessagesQuery } from './quo-messages.schemas.js';
import logger from '../../libs/logger.js';

/**
 * Quo Messages Controller
 */
export class QuoMessagesController {
    /**
     * Get messages
     * 
     * GET /api/v1/messages
     * 
     * Query parameters:
     * - phoneNumberId (required): The OpenPhone number ID
     * - userId (optional): Filter by user ID
     * - participants (optional): Filter by participants (E.164 format)
     * - maxResults (optional): Max results to return (default: 10, max: 100)
     * - pageToken (optional): Pagination token
     */
    async getMessages(
        request: FastifyRequest<{ Querystring: GetMessagesQuery }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            // Validate query parameters using Zod
            const validationResult = getMessagesQuerySchema.safeParse(request.query);

            if (!validationResult.success) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: validationResult.error.errors[0]?.message || 'Invalid query parameters',
                    },
                });
            }

            const { phoneNumberId, userId, participants, maxResults, pageToken } = validationResult.data;

            logger.info(
                { phoneNumberId, userId, maxResults },
                'Processing get messages request'
            );

            // Call service to fetch messages from Quo API
            const messagesResponse = await quoMessagesService.getMessages({
                phoneNumberId,
                userId,
                participants,
                maxResults,
                pageToken,
            });

            // Return success response
            return reply.status(200).send({
                success: true,
                message: 'Messages retrieved successfully',
                data: messagesResponse,
            });
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    status: error.response?.status,
                },
                'Error fetching messages'
            );

            // Handle Quo API errors
            if (error.response) {
                const status = error.response.status;
                const quoError = error.response.data;

                // Map Quo API errors to our error responses
                if (status === 401) {
                    return reply.status(401).send({
                        success: false,
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Invalid API key or unauthorized access',
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

                if (status === 404) {
                    return reply.status(404).send({
                        success: false,
                        error: {
                            code: 'NOT_FOUND',
                            message: 'Phone number or resource not found',
                        },
                    });
                }

                // Generic Quo API error
                return reply.status(status).send({
                    success: false,
                    error: {
                        code: 'QUO_API_ERROR',
                        message: quoError.message || 'Error from Quo API',
                    },
                });
            }

            // Network or other errors
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch messages from Quo API',
                },
            });
        }
    }
}

/**
 * Singleton instance
 */
export const quoMessagesController = new QuoMessagesController();
