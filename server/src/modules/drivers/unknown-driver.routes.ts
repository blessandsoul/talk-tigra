/**
 * Unknown Driver Routes
 *
 * Test endpoints for unknown driver matching
 */

import type { FastifyInstance } from 'fastify';
import { unknownDriverController } from './unknown-driver.controller.js';

export async function unknownDriverRoutes(app: FastifyInstance) {
    // Manually trigger unknown driver matching (for testing)
    app.post('/match', unknownDriverController.matchUnknownDrivers);

    // Get all unmatched unknown drivers
    app.get('/unmatched', unknownDriverController.getUnmatchedDrivers);
}
