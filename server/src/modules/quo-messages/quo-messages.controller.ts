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

    /**
     * Send a text message
     * 
     * POST /api/v1/messages
     * 
     * Request body:
     * - content (required): The text content of the message
     * - to (required): Array of recipient phone numbers in E.164 format
     * - phoneNumberId (optional): The OpenPhone number ID
     * - userId (optional): The user ID
     * - setInboxStatus (optional): Set inbox status ('done' or 'pending')
     */
    async sendMessage(
        request: FastifyRequest<{ Body: any }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            // Import the schema
            const { sendMessageSchema } = await import('./quo-messages.schemas.js');

            // Validate request body using Zod
            const validationResult = sendMessageSchema.safeParse(request.body);

            if (!validationResult.success) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: validationResult.error.errors[0]?.message || 'Invalid request body',
                    },
                });
            }

            const { content, to, phoneNumberId, userId, setInboxStatus } = validationResult.data;

            logger.info(
                { to, contentLength: content.length },
                'Processing send message request'
            );

            // Call service to send message via Quo API
            const messageResponse = await quoMessagesService.sendMessage({
                content,
                to,
                phoneNumberId,
                userId,
                setInboxStatus,
            });

            // Return success response
            return reply.status(201).send({
                success: true,
                message: 'Message sent successfully',
                data: messageResponse,
            });
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    status: error.response?.status,
                },
                'Error sending message'
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
                    message: 'Failed to send message via Quo API',
                },
            });
        }
    }
}

/**
 * Singleton instance
 */
export const quoMessagesController = new QuoMessagesController();
