/**
 * n8n Controller
 *
 * Test endpoints for n8n webhook connectivity
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { n8nService } from './n8n.service.js';
import { quoSyncService } from '../quo-messages/quo-sync.service.js';
import { successResponse } from '../../utils/response.js';

export class N8nController {
    /**
     * Test n8n connection with simple echo
     *
     * POST /api/v1/n8n/test
     * Body: { message: "Hello n8n" }
     */
    async testConnection(request: FastifyRequest, reply: FastifyReply) {
        const body = request.body as any;

        const testData = {
            message: body.message || 'Test message from server',
            timestamp: new Date().toISOString(),
            test: true,
        };

        const response = await n8nService.testConnection(testData);

        return reply.send(
            successResponse('n8n connection test successful', {
                sent: testData,
                received: response,
            })
        );
    }

    /**
     * Send a specific conversation to n8n
     *
     * POST /api/v1/n8n/parse-conversation
     * Body: { conversationId: "..." }
     */
    async parseConversation(request: FastifyRequest, reply: FastifyReply) {
        const { conversationId } = request.body as { conversationId: string };

        // Get conversation from database
        const conversationData = await quoSyncService.getConversationHistory(conversationId);

        if (!conversationData) {
            return reply.status(404).send({
                success: false,
                error: {
                    code: 'CONVERSATION_NOT_FOUND',
                    message: 'Conversation not found',
                },
            });
        }

        // Format messages for AI
        const conversationText = n8nService.formatConversationForAI(conversationData.messages);

        // Get phone number from participants
        const phone = conversationData.participants[0];

        // Send to n8n
        const n8nResponse = await n8nService.parseConversation(conversationText, phone);

        // Save unknown driver if we got load IDs
        if (n8nResponse && n8nResponse.loadIds && n8nResponse.loadIds.length > 0) {
            const { unknownDriverService } = await import('../drivers/unknown-driver.service.js');
            await unknownDriverService.saveUnknownDriver(
                phone,
                n8nResponse.loadIds,
                n8nResponse.location
            );
        }

        return reply.send(
            successResponse('Conversation sent to n8n', {
                // conversationId,
                phone,
                // messageCount: conversationData.messages.length,
                // conversationText,
                n8nResponse,
            })
        );
    }
}

export const n8nController = new N8nController();
