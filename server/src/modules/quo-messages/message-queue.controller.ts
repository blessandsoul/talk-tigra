/**
 * Message Queue Controller
 * 
 * HTTP handlers for message queue endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { messageQueueService } from '../../services/message-queue.service.js';
import logger from '../../libs/logger.js';
import { z } from 'zod';

/**
 * Schema for bulk message request
 */
const bulkMessageSchema = z.object({
    phoneNumbers: z
        .array(z.string())
        .min(1, 'At least one phone number is required')
        .describe('Array of recipient phone numbers in E.164 format'),

    content: z
        .string()
        .min(1, 'Message content is required')
        .describe('The text content of the message to be sent to all recipients'),
});

type BulkMessageRequest = z.infer<typeof bulkMessageSchema>;

/**
 * Message Queue Controller
 */
export class MessageQueueController {
    /**
     * Queue bulk messages
     * 
     * POST /api/v1/messages/queue
     * 
     * Request body:
     * - phoneNumbers (required): Array of phone numbers in E.164 format
     * - content (required): Message content to send to all numbers
     * 
     * The messages will be sent at a rate of 1 per 20 seconds by the cron job.
     */
    async queueBulkMessages(
        request: FastifyRequest<{ Body: BulkMessageRequest }>,
        reply: FastifyReply
    ): Promise<void> {
        try {
            // Validate request body using Zod
            const validationResult = bulkMessageSchema.safeParse(request.body);

            if (!validationResult.success) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: validationResult.error.errors[0]?.message || 'Invalid request body',
                    },
                });
            }

            const { phoneNumbers, content } = validationResult.data;

            logger.info(
                { count: phoneNumbers.length, contentLength: content.length },
                'Processing bulk message queue request'
            );

            // Add messages to queue
            const addedCount = await messageQueueService.addToQueue(phoneNumbers, content);

            // Get queue stats
            const stats = await messageQueueService.getQueueStats();

            // Return success response
            return reply.status(200).send({
                success: true,
                message: `${addedCount} messages added to queue. They will be sent at a rate of 1 per 20 seconds.`,
                data: {
                    addedCount,
                    queueStats: {
                        total: stats.total,
                        pending: stats.pending,
                        sent: stats.sent,
                        failed: stats.failed,
                    },
                    estimatedCompletionTime: `${stats.pending * 20} seconds (${Math.ceil(stats.pending / 3)} minutes)`,
                },
            });
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                },
                'Error queuing bulk messages'
            );

            return reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to queue messages',
                },
            });
        }
    }

    /**
     * Get queue statistics
     * 
     * GET /api/v1/messages/queue/stats
     * 
     * Returns current queue statistics including pending, sent, and failed messages.
     */
    async getQueueStats(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const stats = await messageQueueService.getQueueStats();

            return reply.status(200).send({
                success: true,
                message: 'Queue statistics retrieved successfully',
                data: stats,
            });
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                },
                'Error getting queue stats'
            );

            return reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to get queue statistics',
                },
            });
        }
    }

    /**
     * Clear completed messages from queue
     * 
     * DELETE /api/v1/messages/queue/completed
     * 
     * Removes all sent and failed messages, keeping only pending ones.
     */
    async clearCompleted(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        try {
            const clearedCount = await messageQueueService.clearCompleted();

            return reply.status(200).send({
                success: true,
                message: `${clearedCount} completed messages cleared from queue`,
                data: {
                    clearedCount,
                },
            });
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                },
                'Error clearing completed messages'
            );

            return reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to clear completed messages',
                },
            });
        }
    }
}

/**
 * Singleton instance
 */
export const messageQueueController = new MessageQueueController();
