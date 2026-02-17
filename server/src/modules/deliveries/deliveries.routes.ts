/**
 * Deliveries Routes
 *
 * API endpoints for delivery operations
 */

import type { FastifyInstance } from 'fastify';
import { deliveryController } from './deliveries.controller.js';

/**
 * Register delivery routes
 */
export async function deliveryRoutes(app: FastifyInstance) {
    /**
     * GET /api/v1/deliveries
     * Get all today's deliveries
     */
    app.get('/deliveries', {
        handler: deliveryController.getDeliveries.bind(deliveryController),
    });

    /**
     * PATCH /api/v1/deliveries/:id/notes
     * Update notes for a specific delivery
     */
    app.patch('/deliveries/:id/notes', {
        handler: deliveryController.updateNotes.bind(deliveryController),
    });

    /**
     * POST /api/v1/deliveries/sync
     * Manually trigger delivery sync from Google Sheet
     */
    app.post('/deliveries/sync', {
        handler: deliveryController.manualSync.bind(deliveryController),
    });
}
