/**
 * Pickups Routes
 *
 * API endpoints for pickup operations
 */

import type { FastifyInstance } from 'fastify';
import { pickupController } from './pickups.controller.js';

/**
 * Register pickup routes
 */
export async function pickupRoutes(app: FastifyInstance) {
    /**
     * GET /api/v1/pickups
     * Get all today's pickups
     */
    app.get('/pickups', {
        handler: pickupController.getPickups.bind(pickupController),
    });

    /**
     * PATCH /api/v1/pickups/:id/notes
     * Update notes for a specific pickup
     */
    app.patch('/pickups/:id/notes', {
        handler: pickupController.updateNotes.bind(pickupController),
    });

    /**
     * POST /api/v1/pickups/sync
     * Manually trigger pickup sync from Google Sheet
     */
    app.post('/pickups/sync', {
        handler: pickupController.manualSync.bind(pickupController),
    });
}
