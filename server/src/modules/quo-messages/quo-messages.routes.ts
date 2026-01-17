/**
 * Quo Messages Routes
 * 
 * Fastify routes for Quo messages endpoints
 */

import type { FastifyInstance } from 'fastify';
import { quoMessagesController } from './quo-messages.controller.js';
import { quoPhoneNumbersController } from './quo-phone-numbers.controller.js';
import { quoConversationsController } from './quo-conversations.controller.js';

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
}
