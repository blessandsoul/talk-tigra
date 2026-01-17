/**
 * n8n Routes
 *
 * Test endpoints for n8n webhook integration
 */

import type { FastifyInstance } from 'fastify';
import { n8nController } from './n8n.controller.js';

export default async function n8nRoutes(fastify: FastifyInstance) {
    // Test connection with simple echo
    fastify.post('/test', {
        handler: n8nController.testConnection.bind(n8nController),
    });

    // Parse a specific conversation
    fastify.post('/parse-conversation', {
        handler: n8nController.parseConversation.bind(n8nController),
    });
}
