/**
 * Deliveries Controller
 *
 * HTTP request handlers for delivery operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { deliveryService } from './deliveries.service.js';
import { successResponse } from '../../utils/response.js';
import { updateNotesSchema } from './deliveries.schemas.js';
import { BadRequestError } from '../../utils/errors.js';

class DeliveryController {
    /**
     * GET /api/v1/deliveries
     *
     * Get all today's deliveries
     */
    async getDeliveries(
        _request: FastifyRequest,
        reply: FastifyReply
    ) {
        const deliveries = await deliveryService.getAllDeliveries();

        return reply.send(
            successResponse('Deliveries retrieved successfully', deliveries)
        );
    }

    /**
     * PATCH /api/v1/deliveries/:id/notes
     *
     * Update notes for a specific delivery
     */
    async updateNotes(
        request: FastifyRequest<{
            Params: { id: string };
            Body: { notes: string | null };
        }>,
        reply: FastifyReply
    ) {
        const parsed = updateNotesSchema.safeParse(request.body);
        if (!parsed.success) {
            throw new BadRequestError('Invalid notes data');
        }

        const delivery = await deliveryService.updateDeliveryNotes(
            request.params.id,
            parsed.data.notes
        );

        return reply.send(
            successResponse('Notes updated successfully', delivery)
        );
    }

    /**
     * POST /api/v1/deliveries/sync
     *
     * Manually trigger delivery sync from Google Sheet
     */
    async manualSync(
        _request: FastifyRequest,
        reply: FastifyReply
    ) {
        const result = await deliveryService.syncDeliveries();

        return reply.send(
            successResponse('Delivery sync completed', result)
        );
    }
}

export const deliveryController = new DeliveryController();
