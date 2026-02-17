/**
 * Pickups Controller
 *
 * HTTP request handlers for pickup operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { pickupService } from './pickups.service.js';
import { successResponse } from '../../utils/response.js';
import { updateNotesSchema } from './pickups.schemas.js';
import { BadRequestError } from '../../utils/errors.js';

class PickupController {
    /**
     * GET /api/v1/pickups
     *
     * Get all today's pickups
     */
    async getPickups(
        _request: FastifyRequest,
        reply: FastifyReply
    ) {
        const pickups = await pickupService.getAllPickups();

        return reply.send(
            successResponse('Pickups retrieved successfully', pickups)
        );
    }

    /**
     * PATCH /api/v1/pickups/:id/notes
     *
     * Update notes for a specific pickup
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

        const pickup = await pickupService.updatePickupNotes(
            request.params.id,
            parsed.data.notes
        );

        return reply.send(
            successResponse('Notes updated successfully', pickup)
        );
    }

    /**
     * POST /api/v1/pickups/sync
     *
     * Manually trigger pickup sync from Google Sheet
     */
    async manualSync(
        _request: FastifyRequest,
        reply: FastifyReply
    ) {
        const result = await pickupService.syncPickups();

        return reply.send(
            successResponse('Pickup sync completed', result)
        );
    }
}

export const pickupController = new PickupController();
