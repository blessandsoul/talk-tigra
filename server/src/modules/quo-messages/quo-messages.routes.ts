/**
 * Quo Messages Routes
 * 
 * Fastify routes for Quo messages endpoints
 */

import type { FastifyInstance } from 'fastify';
import { quoMessagesController } from './quo-messages.controller.js';
import { quoPhoneNumbersController } from './quo-phone-numbers.controller.js';
import { quoConversationsController } from './quo-conversations.controller.js';
import { messageQueueController } from './message-queue.controller.js';

/**
 * Register Quo Messages Routes
 * 
 * @param fastify - Fastify instance
 */
export async function quoMessagesRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * GET /phone-numbers
     * 
     * List all phone numbers to find the correct phone number IDs
     */
    fastify.get(
        '/phone-numbers',
        quoPhoneNumbersController.getPhoneNumbers.bind(quoPhoneNumbersController)
    );

    /**
     * GET /conversations
     * 
     * List all conversations (chats)
     * 
     * Query Parameters:
     * - phoneNumberId (optional): Filter by phone number ID
     * - maxResults (optional): Max results (default: 30, max: 100)
     * - pageToken (optional): Pagination token
     */
    fastify.get(
        '/conversations',
        quoConversationsController.getConversations.bind(quoConversationsController)
    );

    /**
     * GET /messages
     * 
     * Get messages from Quo (OpenPhone) API
     * 
     * Query Parameters:
     * - phoneNumberId (required): The OpenPhone number ID
     * - userId (optional): Filter by user ID
     * - participants (optional): Filter by participants
     * - maxResults (optional): Max results (default: 10, max: 100)
     * - pageToken (optional): Pagination token
     */
    fastify.get(
        '/messages',
        quoMessagesController.getMessages.bind(quoMessagesController)
    );

    /**
     * POST /messages
     * 
     * Send a text message to a driver
     * 
     * Request Body:
     * - content (required): The text content of the message
     * - to (required): Array of recipient phone numbers in E.164 format
     * - phoneNumberId (optional): The OpenPhone number ID
     * - userId (optional): The user ID
     * - setInboxStatus (optional): Set inbox status ('done' or 'pending')
     */
    fastify.post(
        '/messages',
        quoMessagesController.sendMessage.bind(quoMessagesController)
    );

    /**
     * POST /messages/queue
     * 
     * Queue bulk messages to be sent at 1 per 20 seconds
     * 
     * Request Body:
     * - phoneNumbers (required): Array of recipient phone numbers in E.164 format
     * - content (required): Message content to send to all recipients
     */
    fastify.post(
        '/messages/queue',
        messageQueueController.queueBulkMessages.bind(messageQueueController)
    );

    /**
     * GET /messages/queue/stats
     * 
     * Get message queue statistics
     */
    fastify.get(
        '/messages/queue/stats',
        messageQueueController.getQueueStats.bind(messageQueueController)
    );

    /**
     * DELETE /messages/queue/completed
     * 
     * Clear completed (sent/failed) messages from queue
     */
    fastify.delete(
        '/messages/queue/completed',
        messageQueueController.clearCompleted.bind(messageQueueController)
    );
}
