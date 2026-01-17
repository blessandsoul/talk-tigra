/**
 * Get Phone Numbers Controller
 * 
 * Helper endpoint to list your OpenPhone numbers and their IDs
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { quoApiClient } from '../../libs/quo-api.js';
import logger from '../../libs/logger.js';

export class QuoPhoneNumbersController {
    /**
     * Get all phone numbers
     * 
     * GET /api/v1/phone-numbers
     */
    async getPhoneNumbers(
        _request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            logger.info('Fetching phone numbers from Quo API');

            const response = await quoApiClient.get('/phone-numbers');

            logger.info(
                { count: response.data.data?.length || 0 },
                'Successfully fetched phone numbers'
            );

            return reply.status(200).send({
                success: true,
                message: 'Phone numbers retrieved successfully',
                data: response.data,
            });
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                },
                'Error fetching phone numbers'
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
                    message: 'Failed to fetch phone numbers',
                },
            });
        }
    }
}

export const quoPhoneNumbersController = new QuoPhoneNumbersController();
