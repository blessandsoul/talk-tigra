/**
 * Message Queue Repository
 *
 * Database access layer for queued message operations.
 */

import { prisma } from '../../libs/db.js';
import type { QueuedMessage } from '@prisma/client';

class MessageQueueRepository {
    /**
     * Bulk insert pending messages
     */
    async createMany(
        messages: Array<{ phoneNumber: string; content: string }>
    ): Promise<number> {
        const result = await prisma.queuedMessage.createMany({
            data: messages.map((msg) => ({
                phoneNumber: msg.phoneNumber,
                content: msg.content,
                status: 'pending',
                attempts: 0,
            })),
        });

        return result.count;
    }

    /**
     * Find the next pending message (oldest first)
     */
    async findNextPending(): Promise<QueuedMessage | null> {
        return prisma.queuedMessage.findFirst({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Mark a message as sent
     */
    async markSent(id: string): Promise<void> {
        await prisma.queuedMessage.update({
            where: { id },
            data: {
                status: 'sent',
                sentAt: new Date(),
                attempts: { increment: 1 },
            },
        });
    }

    /**
     * Mark a message as failed
     */
    async markFailed(id: string, error: string): Promise<void> {
        await prisma.queuedMessage.update({
            where: { id },
            data: {
                status: 'failed',
                error,
                attempts: { increment: 1 },
            },
        });
    }

    /**
     * Increment attempts without changing status (for retry)
     */
    async incrementAttempts(id: string): Promise<void> {
        await prisma.queuedMessage.update({
            where: { id },
            data: {
                attempts: { increment: 1 },
            },
        });
    }

    /**
     * Get queue statistics and message list for dashboard
     */
    async getStats(): Promise<{
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
        const [pending, sent, failed, messages] = await Promise.all([
            prisma.queuedMessage.count({ where: { status: 'pending' } }),
            prisma.queuedMessage.count({ where: { status: 'sent' } }),
            prisma.queuedMessage.count({ where: { status: 'failed' } }),
            prisma.queuedMessage.findMany({
                select: {
                    id: true,
                    phoneNumber: true,
                    status: true,
                    attempts: true,
                    createdAt: true,
                    sentAt: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return {
            total: pending + sent + failed,
            pending,
            sent,
            failed,
            messages,
        };
    }

    /**
     * Delete completed (sent/failed) messages
     * Returns the number of deleted records
     */
    async deleteCompleted(): Promise<number> {
        const result = await prisma.queuedMessage.deleteMany({
            where: {
                status: { in: ['sent', 'failed'] },
            },
        });

        return result.count;
    }
}

export const messageQueueRepo = new MessageQueueRepository();
