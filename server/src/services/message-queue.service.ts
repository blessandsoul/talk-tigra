/**
 * Message Queue Service
 *
 * Manages a queue of messages to be sent at a controlled rate (1 per 20 seconds)
 * to avoid rate limiting and ensure reliable delivery.
 *
 * Messages are persisted to the database so history survives server restarts.
 */

import logger from '../libs/logger.js';
import { quoMessagesService } from '../modules/quo-messages/quo-messages.service.js';
import { messageQueueRepo } from '../modules/quo-messages/message-queue.repo.js';

/**
 * Message Queue Service Class
 *
 * Manages a database-backed queue for sending messages.
 */
class MessageQueueService {
    private isProcessing: boolean = false;

    /**
     * Add multiple phone numbers to the queue
     *
     * @param phoneNumbers - Array of phone numbers in E.164 format
     * @param content - Message content to send to all numbers
     * @returns Number of messages added to queue
     */
    async addToQueue(phoneNumbers: string[], content: string): Promise<number> {
        const messages = phoneNumbers.map((phoneNumber) => ({
            phoneNumber,
            content,
        }));

        const addedCount = await messageQueueRepo.createMany(messages);

        const stats = await messageQueueRepo.getStats();

        logger.info(
            {
                added: addedCount,
                totalInQueue: stats.total,
                pendingCount: stats.pending,
            },
            '[MESSAGE QUEUE] Messages added to queue'
        );

        return addedCount;
    }

    /**
     * Process the next pending message in the queue
     * Called by the cron job every 20 seconds
     */
    async processNext(): Promise<void> {
        if (this.isProcessing) {
            logger.debug('[MESSAGE QUEUE] Already processing, skipping...');
            return;
        }

        const pendingMessage = await messageQueueRepo.findNextPending();

        if (!pendingMessage) {
            logger.debug('[MESSAGE QUEUE] No pending messages to process');
            return;
        }

        this.isProcessing = true;

        try {
            logger.info(
                {
                    messageId: pendingMessage.id,
                    phoneNumber: pendingMessage.phoneNumber,
                    attempt: pendingMessage.attempts + 1,
                },
                '[MESSAGE QUEUE] Processing message'
            );

            // Send the message via Quo API
            await quoMessagesService.sendMessage({
                content: pendingMessage.content,
                to: [pendingMessage.phoneNumber],
            });

            // Mark as sent in the database
            await messageQueueRepo.markSent(pendingMessage.id);

            const stats = await messageQueueRepo.getStats();

            logger.info(
                {
                    messageId: pendingMessage.id,
                    phoneNumber: pendingMessage.phoneNumber,
                    remainingInQueue: stats.pending,
                },
                '[MESSAGE QUEUE] SUCCESS: Message sent'
            );
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Retry up to 3 times
            if (pendingMessage.attempts + 1 >= 3) {
                await messageQueueRepo.markFailed(pendingMessage.id, errorMessage);

                logger.error(
                    {
                        messageId: pendingMessage.id,
                        phoneNumber: pendingMessage.phoneNumber,
                        attempts: pendingMessage.attempts + 1,
                        error: errorMessage,
                    },
                    '[MESSAGE QUEUE] ERROR: Message failed after max attempts'
                );
            } else {
                await messageQueueRepo.incrementAttempts(pendingMessage.id);

                logger.warn(
                    {
                        messageId: pendingMessage.id,
                        phoneNumber: pendingMessage.phoneNumber,
                        attempts: pendingMessage.attempts + 1,
                        error: errorMessage,
                    },
                    '[MESSAGE QUEUE] WARN: Message failed, will retry'
                );
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats(): Promise<{
        total: number;
        pending: number;
        sent: number;
        failed: number;
        messages: Array<{
            id: string;
            phoneNumber: string;
            status: string;
            attempts: number;
            createdAt: Date;
            sentAt: Date | null;
        }>;
    }> {
        return messageQueueRepo.getStats();
    }

    /**
     * Clear completed messages from queue (sent or failed)
     * Keeps only pending messages
     */
    async clearCompleted(): Promise<number> {
        const cleared = await messageQueueRepo.deleteCompleted();

        if (cleared > 0) {
            logger.info(
                { cleared },
                '[MESSAGE QUEUE] Cleared completed messages'
            );
        }

        return cleared;
    }
}

/**
 * Singleton instance
 */
export const messageQueueService = new MessageQueueService();

/**
 * Export class for testing
 */
export { MessageQueueService };
