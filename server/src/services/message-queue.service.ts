/**
 * Message Queue Service
 * 
 * Manages a queue of messages to be sent at a controlled rate (1 per 20 seconds)
 * to avoid rate limiting and ensure reliable delivery.
 */

import logger from '../libs/logger.js';
import { quoMessagesService } from '../modules/quo-messages/quo-messages.service.js';

interface QueuedMessage {
    id: string;
    phoneNumber: string;
    content: string;
    status: 'pending' | 'sent' | 'failed';
    attempts: number;
    createdAt: Date;
    sentAt?: Date;
    error?: string;
}

/**
 * Message Queue Service Class
 * 
 * Manages a simple in-memory queue for sending messages.
 * For production, consider using Redis or a database for persistence.
 */
class MessageQueueService {
    private queue: QueuedMessage[] = [];
    private isProcessing: boolean = false;

    /**
     * Add multiple phone numbers to the queue
     * 
     * @param phoneNumbers - Array of phone numbers in E.164 format
     * @param content - Message content to send to all numbers
     * @returns Number of messages added to queue
     */
    addToQueue(phoneNumbers: string[], content: string): number {
        const timestamp = new Date();

        phoneNumbers.forEach((phoneNumber) => {
            const message: QueuedMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                phoneNumber,
                content,
                status: 'pending',
                attempts: 0,
                createdAt: timestamp,
            };

            this.queue.push(message);
        });

        logger.info(
            {
                added: phoneNumbers.length,
                totalInQueue: this.queue.length,
                pendingCount: this.getPendingCount(),
            },
            '[MESSAGE QUEUE] Messages added to queue'
        );

        return phoneNumbers.length;
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

        const pendingMessage = this.queue.find((msg) => msg.status === 'pending');

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

            // Mark as sent
            pendingMessage.status = 'sent';
            pendingMessage.sentAt = new Date();
            pendingMessage.attempts += 1;

            logger.info(
                {
                    messageId: pendingMessage.id,
                    phoneNumber: pendingMessage.phoneNumber,
                    remainingInQueue: this.getPendingCount(),
                },
                '[MESSAGE QUEUE] SUCCESS: Message sent'
            );
        } catch (error: any) {
            pendingMessage.attempts += 1;

            // Retry up to 3 times
            if (pendingMessage.attempts >= 3) {
                pendingMessage.status = 'failed';
                pendingMessage.error = error.message;

                logger.error(
                    {
                        messageId: pendingMessage.id,
                        phoneNumber: pendingMessage.phoneNumber,
                        attempts: pendingMessage.attempts,
                        error: error.message,
                    },
                    '[MESSAGE QUEUE] ERROR: Message failed after max attempts'
                );
            } else {
                logger.warn(
                    {
                        messageId: pendingMessage.id,
                        phoneNumber: pendingMessage.phoneNumber,
                        attempts: pendingMessage.attempts,
                        error: error.message,
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
    getQueueStats() {
        const pending = this.queue.filter((msg) => msg.status === 'pending').length;
        const sent = this.queue.filter((msg) => msg.status === 'sent').length;
        const failed = this.queue.filter((msg) => msg.status === 'failed').length;

        return {
            total: this.queue.length,
            pending,
            sent,
            failed,
            messages: this.queue.map((msg) => ({
                id: msg.id,
                phoneNumber: msg.phoneNumber,
                status: msg.status,
                attempts: msg.attempts,
                createdAt: msg.createdAt,
                sentAt: msg.sentAt,
            })),
        };
    }

    /**
     * Get count of pending messages
     */
    private getPendingCount(): number {
        return this.queue.filter((msg) => msg.status === 'pending').length;
    }

    /**
     * Clear completed messages from queue (sent or failed)
     * Keeps only pending messages
     */
    clearCompleted(): number {
        const beforeCount = this.queue.length;
        this.queue = this.queue.filter((msg) => msg.status === 'pending');
        const cleared = beforeCount - this.queue.length;

        if (cleared > 0) {
            logger.info(
                { cleared, remaining: this.queue.length },
                '[MESSAGE QUEUE] Cleared completed messages'
            );
        }

        return cleared;
    }

    /**
     * Clear all messages from queue
     */
    clearAll(): void {
        const count = this.queue.length;
        this.queue = [];
        logger.info({ cleared: count }, '[MESSAGE QUEUE] Cleared all messages');
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
