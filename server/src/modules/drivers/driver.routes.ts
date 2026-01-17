/**
 * Driver Routes
 *
 * API endpoints for driver and location operations
 */

import type { FastifyInstance } from 'fastify';
import { driverController } from './driver.controller.js';

/**
 * Register driver routes
 */
export async function driverRoutes(app: FastifyInstance) {
    // ============================================================
    // Driver Endpoints
    // ============================================================

    /**
     * GET /api/v1/drivers
     * Get all drivers with optional filters
     *
     * Query params:
     * - location: Filter by location name (fuzzy match)
     * - state: Filter by state abbreviation (e.g., "NJ", "FL")
     * - phoneNumber: Filter by phone number (partial match)
     */
    app.get('/drivers', {
        handler: driverController.getDrivers.bind(driverController),
    });

    /**
     * GET /api/v1/drivers/stats
     * Get driver statistics
     */
    app.get('/drivers/stats', {
        handler: driverController.getDriverStats.bind(driverController),
    });

    /**
     * GET /api/v1/drivers/:id
     * Get a specific driver by ID with their locations
     */
    app.get('/drivers/:id', {
        handler: driverController.getDriverById.bind(driverController),
    });

    /**
     * GET /api/v1/drivers/phone/:phoneNumber
     * Get a driver by phone number
     */
    app.get('/drivers/phone/:phoneNumber', {
        handler: driverController.getDriverByPhone.bind(driverController),
    });

    /**
     * POST /api/v1/drivers
     * Create a new driver
     */
    app.post('/drivers', {
        handler: driverController.createDriver.bind(driverController),
    });

    /**
     * PATCH /api/v1/drivers/:id
     * Update a driver
     */
    app.patch('/drivers/:id', {
        handler: driverController.updateDriver.bind(driverController),
    });

    /**
     * DELETE /api/v1/drivers/:id
     * Delete a driver
     */
    app.delete('/drivers/:id', {
        handler: driverController.deleteDriver.bind(driverController),
    });

    /**
     * POST /api/v1/drivers/match/:conversationId
     * Manually trigger driver matching for a specific conversation
     */
    app.post('/drivers/match/:conversationId', {
        handler: driverController.matchConversation.bind(driverController),
    });

    /**
     * POST /api/v1/drivers/sync
     * Manually trigger sheet sync + driver matching
     */
    app.post('/drivers/sync', {
        handler: driverController.manualSync.bind(driverController),
    });

    // ============================================================
    // Location Endpoints
    // ============================================================

    /**
     * GET /api/v1/locations
     * Get all locations with optional filters
     *
     * Query params:
     * - state: Filter by state abbreviation
     * - city: Filter by city name
     * - name: Filter by location name
     */
    app.get('/locations', {
        handler: driverController.getLocations.bind(driverController),
    });

    /**
     * GET /api/v1/locations/stats
     * Get location statistics
     */
    app.get('/locations/stats', {
        handler: driverController.getLocationStats.bind(driverController),
    });

    /**
     * GET /api/v1/locations/top
     * Get top locations by driver count
     *
     * Query params:
     * - limit: Number of locations to return (default: 10)
     */
    app.get('/locations/top', {
        handler: driverController.getTopLocations.bind(driverController),
    });

    /**
     * GET /api/v1/locations/search
     * Search locations by query
     *
     * Query params:
     * - q: Search query (required)
     */
    app.get('/locations/search', {
        handler: driverController.searchLocations.bind(driverController),
    });

    /**
     * GET /api/v1/locations/:id
     * Get a specific location by ID with drivers
     */
    app.get('/locations/:id', {
        handler: driverController.getLocationById.bind(driverController),
    });

    // ============================================================
    // Driver-Location Links
    // ============================================================

    /**
     * GET /api/v1/driver-locations
     * Get all driver-location links with readable data
     *
     * Query params:
     * - location: Filter by location name (fuzzy match)
     * - state: Filter by state abbreviation
     * - recentDays: Only show links from last N days
     */
    app.get('/driver-locations', {
        handler: driverController.getDriverLocations.bind(driverController),
    });
}
