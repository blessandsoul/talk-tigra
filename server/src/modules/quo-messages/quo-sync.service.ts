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
import { hasStopCommand, isStopMessage } from '../../libs/stop-command-extractor.js';
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
            // Check for /STOP opt-outs FIRST (independent of conversation list)
            // This catches /STOP from ANY conversation, including archived/snoozed ones
            await this.checkForStopCommands(phoneNumberId);

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
     * Check for /STOP opt-out commands using two strategies:
     *
     * 1. DB scan: Check all stored messages for /STOP (free, instant)
     * 2. Targeted API scan: For conversations NOT in the top 100 (stale),
     *    fetch recent messages directly from OpenPhone API.
     *    Limited to 20 conversations per cycle to avoid excessive API calls.
     *
     * This ensures /STOP is caught even from archived/snoozed conversations.
     */
    private async checkForStopCommands(phoneNumberId: string): Promise<void> {
        const { driverRepository } = await import('../../modules/drivers/driver.repo.js');
        let optOutCount = 0;

        // --- Strategy 1: Scan messages already stored in our DB ---
        try {
            const stopMessages = await prisma.message.findMany({
                where: {
                    direction: 'incoming',
                    text: { in: ['/STOP', '/stop', '/Stop', '/STOP ', '/stop ', ' /STOP', ' /stop'] },
                },
                select: { from: true },
                distinct: ['from'],
            });

            for (const msg of stopMessages) {
                const phone = msg.from;
                if (!phone) continue;

                const result = await this.markDriverOptedOut(phone, driverRepository, 'DB scan');
                if (result) optOutCount++;
            }
        } catch (error: any) {
            logger.warn({ error: error.message }, '[STOP COMMAND] DB scan for /STOP failed');
        }

        // --- Strategy 2: Check stale conversations via targeted API calls ---
        try {
            // Get conversations that haven't been synced recently (not in top 100)
            // These are conversations we know about but can't reach via the normal sync
            const staleConversations = await prisma.conversation.findMany({
                where: {
                    syncedAt: {
                        lt: new Date(Date.now() - 30 * 60 * 1000), // Not synced in last 30 min
                    },
                },
                select: { id: true, participants: true },
                take: 20, // Limit API calls per cycle
                orderBy: { syncedAt: 'asc' }, // Check oldest-synced first
            });

            for (const convo of staleConversations) {
                try {
                    const participants: string[] = JSON.parse(convo.participants);
                    const driverPhone = participants[0];
                    if (!driverPhone) continue;

                    // Skip if driver is already opted out
                    const existingDriver = await driverRepository.findByPhoneNumber(driverPhone);
                    if (existingDriver?.notes?.trim().toLowerCase() === 'x') continue;

                    // Fetch recent messages from OpenPhone API for this participant
                    const messagesResponse = await quoApiClient.get<GetMessagesResponse>(
                        '/messages',
                        {
                            params: {
                                phoneNumberId,
                                participants: driverPhone,
                                maxResults: 10,
                            },
                        }
                    );

                    const messages = messagesResponse.data.data;
                    const hasStop = messages.some(
                        (m) => m.direction === 'incoming' && isStopMessage(m.text || '')
                    );

                    if (hasStop) {
                        const result = await this.markDriverOptedOut(driverPhone, driverRepository, 'API scan');
                        if (result) optOutCount++;
                    }
                } catch (error: any) {
                    // Skip individual conversation errors, continue with others
                    logger.debug(
                        { conversationId: convo.id, error: error.message },
                        '[STOP COMMAND] Failed to check stale conversation'
                    );
                }
            }
        } catch (error: any) {
            logger.warn({ error: error.message }, '[STOP COMMAND] Stale conversation scan failed');
        }

        if (optOutCount > 0) {
            logger.info(
                { optOutCount },
                `[STOP COMMAND] Global scan complete - ${optOutCount} new opt-outs processed`
            );
        }
    }

    /**
     * Mark a driver as opted out (set notes to "x")
     * Returns true if the driver was newly marked, false if already opted out.
     */
    private async markDriverOptedOut(
        phone: string,
        driverRepository: any,
        source: string
    ): Promise<boolean> {
        const existingDriver = await driverRepository.findByPhoneNumber(phone);

        if (existingDriver) {
            if (existingDriver.notes?.trim().toLowerCase() !== 'x') {
                await driverRepository.update(existingDriver.id, { notes: 'x' });
                logger.info(
                    { phone, driverId: existingDriver.id, source },
                    '[STOP COMMAND] Driver opted out - set notes to "x"'
                );
                return true;
            }
            return false;
        } else {
            await driverRepository.create({ phoneNumber: phone, notes: 'x' });
            logger.info(
                { phone, source },
                '[STOP COMMAND] Created new driver with opt-out notes "x"'
            );
            return true;
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

            // Check for /STOP opt-out in incoming messages (runs every sync, not just when needsParsing)
            const driverPhone = participants[0];
            const hasStop = messages.some(
                (msg) => msg.direction === 'incoming' && isStopMessage(msg.text || '')
            );

            if (hasStop && driverPhone) {
                const { driverRepository } = await import('../../modules/drivers/driver.repo.js');
                const existingDriver = await driverRepository.findByPhoneNumber(driverPhone);

                if (existingDriver) {
                    if (existingDriver.notes?.trim().toLowerCase() !== 'x') {
                        await driverRepository.update(existingDriver.id, { notes: 'x' });
                        logger.info(
                            { phone: driverPhone, driverId: existingDriver.id, conversationId },
                            '[STOP COMMAND] Driver opted out during message sync - set notes to "x"'
                        );
                    }
                } else {
                    await driverRepository.create({ phoneNumber: driverPhone, notes: 'x' });
                    logger.info(
                        { phone: driverPhone, conversationId },
                        '[STOP COMMAND] Created new driver with opt-out notes "x" during message sync'
                    );
                }
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

            const { unknownDriverService } = await import('../../modules/drivers/unknown-driver.service.js');

            // Step 0: Check for /STOP opt-out command before any load ID parsing
            if (hasStopCommand(conversationData.messages)) {
                const { driverRepository } = await import('../../modules/drivers/driver.repo.js');
                const existingDriver = await driverRepository.findByPhoneNumber(phone);

                if (existingDriver) {
                    // Only update if notes is not already "x"
                    if (existingDriver.notes?.trim().toLowerCase() !== 'x') {
                        await driverRepository.update(existingDriver.id, { notes: 'x' });
                        logger.info(
                            { phone, driverId: existingDriver.id },
                            '[STOP COMMAND] Driver opted out - set notes to "x"'
                        );
                    }
                } else {
                    // Driver doesn't exist yet - create with "x" notes so they're excluded from the start
                    await driverRepository.create({ phoneNumber: phone, notes: 'x' });
                    logger.info(
                        { phone },
                        '[STOP COMMAND] Created new driver with opt-out notes "x"'
                    );
                }

                // Skip load ID parsing entirely for this conversation
                return;
            }

            // Step 1: Try regex first (instant, free, no external dependency)
            const rawText = conversationData.messages.map((m: { text?: string }) => m.text || '').join(' ');
            const regexLoadIds = extractLoadIdsFromText(rawText);

            if (regexLoadIds.length > 0) {
                await unknownDriverService.saveUnknownDriver(phone, regexLoadIds);

                logger.info(
                    { phone, loadIds: regexLoadIds },
                    '[REGEX] SUCCESS: Found load IDs -> Saved unknown driver'
                );
                return; // Regex found load IDs, skip AI
            }

            // Step 2: Regex found nothing -> try AI as fallback
            logger.info(
                {
                    phone,
                    messageCount: conversationData.messages.length,
                    firstMessage: conversationData.messages[0]?.text?.substring(0, 50) || 'NO TEXT',
                },
                '[REGEX] No load IDs found, trying AI fallback...'
            );

            const { n8nService } = await import('../../modules/n8n/n8n.service.js');
            const conversationText = n8nService.formatConversationForAI(conversationData.messages);

            const n8nResponse = await n8nQueue.add(() =>
                n8nService.parseConversation(conversationText, phone)
            );

            if (n8nResponse && n8nResponse.loadIds && n8nResponse.loadIds.length > 0) {
                await unknownDriverService.saveUnknownDriver(
                    phone,
                    n8nResponse.loadIds,
                    n8nResponse.location
                );

                logger.info(
                    { phone, loadIds: n8nResponse.loadIds },
                    '[AI FALLBACK] SUCCESS: Found load IDs -> Saved unknown driver'
                );
            } else {
                logger.info({ phone }, '[AI FALLBACK] No load IDs found in conversation either');
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
