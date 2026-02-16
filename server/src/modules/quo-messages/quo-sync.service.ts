/**
 * Quo Sync Service
 * 
 * Background service to sync conversations and messages from Quo API to database
 */

import { quoApiClient } from '../../libs/quo-api.js';
import { prisma } from '../../libs/db.js';
import logger from '../../libs/logger.js';
import { n8nQueue } from '../../libs/async-queue.js';
import { extractLoadIdsFromText } from '../../libs/load-id-extractor.js';
import type { GetConversationsResponse, GetMessagesResponse } from '../../types/quo-api.types.js';

export class QuoSyncService {
    /**
     * Sync all conversations and their messages
     * 
     * This will:
     * 1. Fetch all conversations from Quo API
     * 2. For each conversation, fetch recent messages
     * 3. Store/update conversations and messages in database
     */
    async syncAllConversations(phoneNumberId: string): Promise<void> {
        const startTime = Date.now();

        try {
            logger.info(
                { phoneNumberId, maxResults: 100 },
                '[QUO SYNC] Starting conversation sync...'
            );

            // Fetch all conversations
            const conversationsResponse = await quoApiClient.get<GetConversationsResponse>(
                '/conversations',
                {
                    params: {
                        phoneNumberId,
                        maxResults: 100, // Fetch 100 conversations (safe limit)
                    },
                }
            );

            const conversations = conversationsResponse.data.data;
            logger.info(
                { count: conversations.length },
                `[QUO SYNC] SUCCESS: Fetched ${conversations.length} conversations from Quo API`
            );

            // Process each conversation
            let processed = 0;
            let parsed = 0;
            let skipped = 0;

            for (const quoConversation of conversations) {
                const result = await this.syncConversation(quoConversation, phoneNumberId);
                processed++;

                if (result.parsed) parsed++;
                if (result.skipped) skipped++;

                // Log progress every 10 conversations
                if (processed % 10 === 0) {
                    logger.info(
                        { processed, total: conversations.length, parsed, skipped },
                        `[QUO SYNC] PROGRESS: Progress: ${processed}/${conversations.length} conversations`
                    );
                }
            }

            const duration = Date.now() - startTime;
            logger.info(
                {
                    total: conversations.length,
                    processed,
                    parsed,
                    skipped,
                    durationMs: duration,
                    durationSec: (duration / 1000).toFixed(1)
                },
                `[QUO SYNC] SUCCESS: Completed! Processed ${processed} conversations (${parsed} parsed, ${skipped} skipped) in ${(duration / 1000).toFixed(1)}s`
            );
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    phoneNumberId,
                },
                '[QUO SYNC] ERROR: Failed to sync conversations'
            );
            throw error;
        }
    }

    /**
     * Sync a single conversation and its messages
     * 
     * Improvement #1: Skip parsing if conversation hasn't changed since last parse
     */
    private async syncConversation(quoConversation: any, phoneNumberId: string): Promise<{ parsed: boolean; skipped: boolean }> {
        try {
            // Check if this conversation needs parsing (has it changed since last parse?)
            const existingConversation = await prisma.conversation.findUnique({
                where: { id: quoConversation.id },
                select: { lastParsedAt: true, lastActivityAt: true },
            });

            const lastActivityAt = new Date(quoConversation.lastActivityAt);
            const needsParsing = !existingConversation?.lastParsedAt ||
                lastActivityAt > existingConversation.lastParsedAt;

            // Upsert conversation
            await prisma.conversation.upsert({
                where: { id: quoConversation.id },
                create: {
                    id: quoConversation.id,
                    phoneNumberId: quoConversation.phoneNumberId,
                    participants: JSON.stringify(quoConversation.participants),
                    name: quoConversation.name,
                    assignedTo: quoConversation.assignedTo,
                    lastActivityAt,
                    lastActivityId: quoConversation.lastActivityId,
                    mutedUntil: quoConversation.mutedUntil ? new Date(quoConversation.mutedUntil) : null,
                    snoozedUntil: quoConversation.snoozedUntil ? new Date(quoConversation.snoozedUntil) : null,
                    deletedAt: quoConversation.deletedAt ? new Date(quoConversation.deletedAt) : null,
                    syncedAt: new Date(),
                },
                update: {
                    participants: JSON.stringify(quoConversation.participants),
                    name: quoConversation.name,
                    assignedTo: quoConversation.assignedTo,
                    lastActivityAt,
                    lastActivityId: quoConversation.lastActivityId,
                    mutedUntil: quoConversation.mutedUntil ? new Date(quoConversation.mutedUntil) : null,
                    snoozedUntil: quoConversation.snoozedUntil ? new Date(quoConversation.snoozedUntil) : null,
                    deletedAt: quoConversation.deletedAt ? new Date(quoConversation.deletedAt) : null,
                    syncedAt: new Date(),
                },
            });

            // Always fetch messages to keep DB in sync
            await this.syncMessagesForConversation(quoConversation.id, phoneNumberId, quoConversation.participants);

            // Only parse with n8n if conversation has NEW activity
            if (needsParsing) {
                await this.parseConversationWithN8n(quoConversation.id, quoConversation.participants);

                // Update lastParsedAt to mark this conversation as processed
                await prisma.conversation.update({
                    where: { id: quoConversation.id },
                    data: { lastParsedAt: new Date() },
                });

                logger.debug({ conversationId: quoConversation.id }, '[SYNC] Synced and parsed conversation');
                return { parsed: true, skipped: false };
            } else {
                logger.debug({ conversationId: quoConversation.id }, '[SYNC] Skipped parsing - no new activity');
                return { parsed: false, skipped: true };
            }
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    conversationId: quoConversation.id,
                },
                '[SYNC] ERROR: Failed to sync conversation'
            );
            return { parsed: false, skipped: false };
        }
    }

    /**
     * Sync messages for a specific conversation
     */
    private async syncMessagesForConversation(
        conversationId: string,
        phoneNumberId: string,
        participants: string[]
    ): Promise<void> {
        try {
            // Fetch messages from Quo API
            const messagesResponse = await quoApiClient.get<GetMessagesResponse>(
                '/messages',
                {
                    params: {
                        phoneNumberId,
                        participants: participants[0], // Get messages with first participant
                        maxResults: 100, // Get last 100 messages (better for finding Load IDs)
                    },
                }
            );

            const messages = messagesResponse.data.data;

            // Store each message
            for (const quoMessage of messages) {
                await prisma.message.upsert({
                    where: { id: quoMessage.id },
                    create: {
                        id: quoMessage.id,
                        conversationId,
                        phoneNumberId: quoMessage.phoneNumberId,
                        direction: quoMessage.direction,
                        from: quoMessage.from,
                        to: JSON.stringify(quoMessage.to),
                        text: quoMessage.text || '',
                        userId: quoMessage.userId,
                        status: quoMessage.status,
                        createdAt: new Date(quoMessage.createdAt),
                        syncedAt: new Date(),
                    },
                    update: {
                        status: quoMessage.status,
                        text: quoMessage.text || '',
                        syncedAt: new Date(),
                    },
                });
            }

            logger.debug(
                { conversationId, messageCount: messages.length },
                'Synced messages for conversation'
            );
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    conversationId,
                },
                'Failed to sync messages for conversation'
            );
        }
    }

    /**
     * Parse conversation with n8n to extract load IDs
     * 
     * This runs after syncing messages and sends the conversation
     * to n8n for AI parsing to extract load IDs and location
     */
    private async parseConversationWithN8n(conversationId: string, participants: string[]): Promise<void> {
        try {
            // Get conversation history from database
            const conversationData = await this.getConversationHistory(conversationId);

            if (!conversationData || conversationData.messages.length === 0) {
                logger.warn({ conversationId }, '[N8N] Skipping - no messages found in database');
                return;
            }

            // Get phone number
            const phone = participants[0];
            if (!phone) {
                logger.warn({ conversationId }, '[N8N] Skipping - no phone number');
                return;
            }

            // Import n8n service and unknown driver service
            const { n8nService } = await import('../../modules/n8n/n8n.service.js');
            const { unknownDriverService } = await import('../../modules/drivers/unknown-driver.service.js');

            // Format messages for AI
            const conversationText = n8nService.formatConversationForAI(conversationData.messages);

            // DEBUG: Log what we're sending
            logger.info(
                {
                    phone,
                    messageCount: conversationData.messages.length,
                    textLength: conversationText.length,
                    firstMessage: conversationData.messages[0]?.text?.substring(0, 50) || 'NO TEXT',
                },
                '[N8N] Sending conversation to n8n for parsing...'
            );

            // Improvement #2: Use queue for rate-limited n8n requests
            const n8nResponse = await n8nQueue.add(() =>
                n8nService.parseConversation(conversationText, phone)
            );

            // Save unknown driver if we got load IDs from AI
            const aiFoundLoadIds = n8nResponse && n8nResponse.loadIds && n8nResponse.loadIds.length > 0;

            if (aiFoundLoadIds) {
                await unknownDriverService.saveUnknownDriver(
                    phone,
                    n8nResponse.loadIds,
                    n8nResponse.location
                );

                logger.info(
                    { phone, loadIds: n8nResponse.loadIds, location: n8nResponse.location },
                    '[N8N] SUCCESS: Found load IDs -> Saved unknown driver'
                );
            } else {
                // AI failed or found nothing -> use regex fallback
                logger.info({ phone }, '[N8N] No load IDs from AI, trying regex fallback...');

                const rawText = conversationData.messages.map((m: { text?: string }) => m.text || '').join(' ');
                const regexLoadIds = extractLoadIdsFromText(rawText);

                if (regexLoadIds.length > 0) {
                    await unknownDriverService.saveUnknownDriver(
                        phone,
                        regexLoadIds
                    );

                    logger.info(
                        { phone, loadIds: regexLoadIds },
                        '[REGEX FALLBACK] SUCCESS: Found load IDs via regex -> Saved unknown driver'
                    );
                } else {
                    logger.info({ phone }, '[REGEX FALLBACK] No load IDs found in conversation');
                }
            }
        } catch (error: any) {
            // Don't fail the entire sync if n8n parsing fails
            logger.warn(
                {
                    error: error.message,
                    conversationId,
                },
                '[N8N] WARNING: Failed to parse conversation (non-critical)'
            );
        }
    }

    /**
     * Get conversation history from database
     * 
     * Returns conversations with their messages in a format
     * that's easy for AI and humans to understand
     */
    async getConversationHistory(conversationId: string): Promise<any> {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: {
                    take: 100, // Limit to last 100 messages for AI context
                    orderBy: { createdAt: 'desc' }, // Get NEWEST first
                },
            },
        });

        if (!conversation) {
            return null;
        }

        // Format for easy reading
        // Reverse messages to be chronological (Oldest -> Newest)
        const chronologicalMessages = conversation.messages.reverse();

        return {
            conversationId: conversation.id,
            participants: JSON.parse(conversation.participants),
            lastActivity: conversation.lastActivityAt,
            messages: chronologicalMessages.map((msg) => ({
                id: msg.id,
                timestamp: msg.createdAt,
                direction: msg.direction,
                from: msg.from,
                to: JSON.parse(msg.to),
                text: msg.text,
                status: msg.status,
            })),
        };
    }
}

export const quoSyncService = new QuoSyncService();
