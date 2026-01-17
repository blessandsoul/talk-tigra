/**
 * Unknown Driver Controller
 *
 * Test endpoints for unknown driver matching
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { unknownDriverService } from './unknown-driver.service.js';
import { successResponse } from '../../utils/response.js';
import { prisma } from '../../libs/db.js';

export class UnknownDriverController {
    /**
     * Manually trigger unknown driver matching
     *
     * POST /api/v1/unknown-drivers/match
     */
    async matchUnknownDrivers(request: FastifyRequest, reply: FastifyReply) {
        const result = await unknownDriverService.matchUnknownDrivers();

        return reply.send(
            successResponse('Unknown driver matching completed', {
                matchedCount: result.matchedCount,
                totalChecked: result.totalChecked,
            })
        );
    }

    /**
     * Get all unmatched unknown drivers
     *
     * GET /api/v1/unknown-drivers/unmatched
     * Supports pagination via page and limit query params
     */
    async getUnmatchedDrivers(
        request: FastifyRequest<{
            Querystring: {
                page?: number;
                limit?: number;
            };
        }>,
        reply: FastifyReply
    ) {
        const { page = 1, limit = 20 } = request.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);

        // Get total count
        const totalItems = await prisma.unknownDriver.count({
            where: { matched: false },
        });

        // Get paginated data
        const unknownDrivers = await prisma.unknownDriver.findMany({
            where: { matched: false },
            orderBy: { createdAt: 'desc' },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
        });

        const formatted = unknownDrivers.map((driver) => ({
            id: driver.id,
            phoneNumber: driver.phoneNumber,
            loadIds: JSON.parse(driver.loadIds),
            rawLocation: driver.rawLocation,
            createdAt: driver.createdAt,
        }));

        const { paginatedResponse } = await import('../../utils/response.js');
        return reply.send(
            paginatedResponse(
                'Unmatched unknown drivers retrieved',
                formatted,
                pageNum,
                limitNum,
                totalItems
            )
        );
    }
}

export const unknownDriverController = new UnknownDriverController();
