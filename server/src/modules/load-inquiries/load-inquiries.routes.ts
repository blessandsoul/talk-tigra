/**
 * Load Inquiry Routes
 *
 * Endpoints for tracking which drivers texted about which loads
 */

import type { FastifyInstance } from 'fastify';
import { loadInquiryController } from './load-inquiries.controller.js';

export async function loadInquiryRoutes(app: FastifyInstance): Promise<void> {
    // Stats must be registered BEFORE /:loadId to avoid param collision
    app.get('/load-inquiries/stats', loadInquiryController.getStats);

    // Get all loads a specific driver asked about
    app.get('/load-inquiries/driver/:phone', loadInquiryController.getByPhone);

    // Get all drivers who texted about a specific load ID
    app.get('/load-inquiries/:loadId', loadInquiryController.getByLoadId);
}
