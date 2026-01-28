/**
 * Driver Controller
 *
 * HTTP request handlers for driver operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { driverService } from './driver.service.js';
import { successResponse } from '../../utils/response.js';
import { driverMatchingService } from './driver-matching.service.js';
import { runDriverSyncManually } from '../../libs/driver-sync-scheduler.js';

/**
 * Driver Controller Class
 */
class DriverController {
    /**
     * GET /api/v1/drivers
     *
     * Get all drivers with optional filters
     */
    async getDrivers(
        request: FastifyRequest<{
            Querystring: {
                location?: string;
                state?: string;
                phoneNumber?: string;
            };
        }>,
        reply: FastifyReply
    ) {
        const { location, state, phoneNumber } = request.query;

        const drivers = await driverService.getDrivers({
            location,
            state,
            phoneNumber,
        });

        return reply.send(
            successResponse('Drivers retrieved successfully', drivers)
        );
    }

    /**
     * GET /api/v1/drivers/:id
     *
     * Get a specific driver by ID with their locations
     */
    async getDriverById(
        request: FastifyRequest<{
            Params: { id: string };
        }>,
        reply: FastifyReply
    ) {
        const driver = await driverService.getDriverById(request.params.id);

        return reply.send(
            successResponse('Driver retrieved successfully', driver)
        );
    }

    /**
     * GET /api/v1/drivers/phone/:phoneNumber
     *
     * Get a driver by phone number
     */
    async getDriverByPhone(
        request: FastifyRequest<{
            Params: { phoneNumber: string };
        }>,
        reply: FastifyReply
    ) {
        const driver = await driverService.getDriverByPhone(
            request.params.phoneNumber
        );

        return reply.send(
            successResponse('Driver retrieved successfully', driver)
        );
    }

    /**
     * POST /api/v1/drivers
     *
     * Create a new driver
     */
    async createDriver(
        request: FastifyRequest<{
            Body: {
                phoneNumber: string;
                driverNumber?: string;
                name?: string;
                companyName?: string;
                notes?: string;
                locations?: string[];
            };
        }>,
        reply: FastifyReply
    ) {
        const driver = await driverService.createDriver(request.body);

        return reply.status(201).send(
            successResponse('Driver created successfully', driver)
        );
    }

    /**
     * PATCH /api/v1/drivers/:id
     *
     * Update a driver
     */
    async updateDriver(
        request: FastifyRequest<{
            Params: { id: string };
            Body: {
                phoneNumber?: string;
                name?: string;
                companyName?: string;
                notes?: string;
                driverNumber?: string;
                locations?: string[];
            };
        }>,
        reply: FastifyReply
    ) {
        const driver = await driverService.updateDriver(
            request.params.id,
            request.body
        );

        return reply.send(
            successResponse('Driver updated successfully', driver)
        );
    }

    /**
     * DELETE /api/v1/drivers/:id
     *
     * Delete a driver
     */
    async deleteDriver(
        request: FastifyRequest<{
            Params: { id: string };
        }>,
        reply: FastifyReply
    ) {
        await driverService.deleteDriver(request.params.id);

        return reply.send(
            successResponse('Driver deleted successfully', null)
        );
    }

    /**
     * GET /api/v1/drivers/stats
     *
     * Get driver statistics
     */
    async getDriverStats(
        _request: FastifyRequest,
        reply: FastifyReply
    ) {
        const stats = await driverService.getDriverStats();

        return reply.send(
            successResponse('Driver statistics retrieved successfully', stats)
        );
    }

    /**
     * GET /api/v1/locations
     *
     * Get all locations with optional filters
     */
    async getLocations(
        request: FastifyRequest<{
            Querystring: {
                state?: string;
                city?: string;
                name?: string;
            };
        }>,
        reply: FastifyReply
    ) {
        const locations = await driverService.getLocations(request.query);

        return reply.send(
            successResponse('Locations retrieved successfully', locations)
        );
    }

    /**
     * GET /api/v1/locations/:id
     *
     * Get a specific location by ID with drivers
     */
    async getLocationById(
        request: FastifyRequest<{
            Params: { id: string };
        }>,
        reply: FastifyReply
    ) {
        const location = await driverService.getLocationById(
            request.params.id
        );

        return reply.send(
            successResponse('Location retrieved successfully', location)
        );
    }

    /**
     * GET /api/v1/locations/search
     *
     * Search locations by query
     */
    async searchLocations(
        request: FastifyRequest<{
            Querystring: {
                q: string;
            };
        }>,
        reply: FastifyReply
    ) {
        const { q } = request.query;

        if (!q) {
            return reply.status(400).send({
                success: false,
                error: {
                    code: 'MISSING_QUERY',
                    message: 'Query parameter "q" is required',
                },
            });
        }

        const locations = await driverService.searchLocations(q);

        return reply.send(
            successResponse('Locations found successfully', locations)
        );
    }

    /**
     * GET /api/v1/locations/stats
     *
     * Get location statistics
     */
    async getLocationStats(
        _request: FastifyRequest,
        reply: FastifyReply
    ) {
        const stats = await driverService.getLocationStats();

        return reply.send(
            successResponse('Location statistics retrieved successfully', stats)
        );
    }

    /**
     * GET /api/v1/locations/top
     *
     * Get top locations by driver count
     */
    async getTopLocations(
        request: FastifyRequest<{
            Querystring: {
                limit?: number;
            };
        }>,
        reply: FastifyReply
    ) {
        const limit = request.query.limit || 10;

        const locations = await driverService.getTopLocations(limit);

        return reply.send(
            successResponse('Top locations retrieved successfully', locations)
        );
    }

    /**
     * POST /api/v1/drivers/match/:conversationId
     *
     * Manually trigger driver matching for a specific conversation
     */
    async matchConversation(
        request: FastifyRequest<{
            Params: { conversationId: string };
            Body: {
                phoneNumber: string;
            };
        }>,
        reply: FastifyReply
    ) {
        const { conversationId } = request.params;
        const { phoneNumber } = request.body;

        const result = await driverMatchingService.processConversation(
            conversationId,
            phoneNumber
        );

        return reply.send(
            successResponse('Driver matching completed', result)
        );
    }

    /**
     * POST /api/v1/drivers/sync
     *
     * Manually trigger sheet sync + driver matching
     */
    async manualSync(
        _request: FastifyRequest,
        reply: FastifyReply
    ) {
        const result = await runDriverSyncManually();

        return reply.send(
            successResponse('Manual sync completed', result)
        );
    }

    /**
     * GET /api/v1/driver-locations
     *
     * Get all driver-location links with readable data (phone numbers and location names)
     * Supports pagination via page and limit query params
     */
    async getDriverLocations(
        request: FastifyRequest<{
            Querystring: {
                location?: string;
                state?: string;
                recentDays?: number;
                phoneNumber?: string;
                page?: number;
                limit?: number;
            };
        }>,
        reply: FastifyReply
    ) {
        const { location, state, recentDays, phoneNumber, page = 1, limit = 20 } = request.query;

        const result = await driverService.getDriverLocationsReadablePaginated({
            location,
            state,
            recentDays,
            phoneNumber,
            page: Number(page),
            limit: Number(limit),
        });

        return reply.send(result);
    }
}

export const driverController = new DriverController();
