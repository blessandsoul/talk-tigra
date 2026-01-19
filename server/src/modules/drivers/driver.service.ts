/**
 * Driver Service
 *
 * Business logic for driver operations
 */

import { driverRepository } from './driver.repo.js';
import { locationRepository } from './location.repo.js';
import { driverLocationRepository } from './driver-location.repo.js';
import { NotFoundError } from '../../utils/errors.js';
import type { Driver } from '@prisma/client';

/**
 * Driver Service Class
 */
class DriverService {
    /**
     * Get all drivers with optional filters
     */
    async getDrivers(filters: {
        location?: string;
        state?: string;
        phoneNumber?: string;
    }) {
        // If location filter is provided, search by location name
        if (filters.location) {
            return driverRepository.findByLocationName(filters.location);
        }

        // If state filter is provided
        if (filters.state) {
            return driverRepository.findByState(filters.state);
        }

        // Otherwise, get all drivers with optional phone filter
        return driverRepository.findMany({
            phoneNumber: filters.phoneNumber,
        });
    }

    /**
     * Get a specific driver by ID with their locations
     */
    async getDriverById(id: string) {
        const driver = await driverRepository.findByIdWithLocations(id);

        if (!driver) {
            throw new NotFoundError('Driver not found');
        }

        return driver;
    }

    /**
     * Get a driver by phone number
     */
    async getDriverByPhone(phoneNumber: string) {
        const driver = await driverRepository.findByPhoneNumber(phoneNumber);

        if (!driver) {
            throw new NotFoundError('Driver not found');
        }

        return driver;
    }

    /**
     * Get all drivers working in a specific location
     */
    async getDriversByLocation(locationName: string) {
        return driverRepository.findByLocationName(locationName);
    }

    /**
     * Get all drivers working in a specific state
     */
    async getDriversByState(state: string) {
        return driverRepository.findByState(state);
    }

    /**
     * Create a new driver
     */
    async createDriver(data: {
        phoneNumber: string;
        name?: string;
        companyName?: string;
        notes?: string;
    }) {
        return driverRepository.create(data);
    }

    /**
     * Update a driver
     */
    async updateDriver(
        id: string,
        data: {
            name?: string;
            companyName?: string;
            notes?: string;
        }
    ) {
        const driver = await driverRepository.findByPhoneNumber(id);

        if (!driver) {
            throw new NotFoundError('Driver not found');
        }

        return driverRepository.update(id, data);
    }

    /**
     * Delete a driver
     */
    async deleteDriver(id: string) {
        const driver = await driverRepository.findByPhoneNumber(id);

        if (!driver) {
            throw new NotFoundError('Driver not found');
        }

        return driverRepository.delete(id);
    }

    /**
     * Get driver statistics
     */
    async getDriverStats() {
        return driverRepository.getStats();
    }

    /**
     * Get location statistics
     */
    async getLocationStats() {
        return locationRepository.getStats();
    }

    /**
     * Get all locations
     */
    async getLocations(filters: {
        state?: string;
        city?: string;
        name?: string;
    }) {
        return locationRepository.findMany(filters);
    }

    /**
     * Get a specific location by ID with drivers
     */
    async getLocationById(id: string) {
        const location = await locationRepository.findByIdWithDrivers(id);

        if (!location) {
            throw new NotFoundError('Location not found');
        }

        return location;
    }

    /**
     * Search locations by query
     */
    async searchLocations(query: string) {
        return locationRepository.search(query);
    }

    /**
     * Get top locations by driver count
     */
    async getTopLocations(limit: number = 10) {
        return locationRepository.getTopLocations(limit);
    }

    /**
     * Get driver-location link statistics
     */
    async getDriverLocationStats() {
        return driverLocationRepository.getStats();
    }

    /**
     * Get recently active driver-location links
     */
    async getRecentlyActiveLinks(days: number = 30) {
        return driverLocationRepository.getRecentlyActive(days);
    }

    /**
     * Get top driver-location matches
     */
    async getTopMatches(limit: number = 10) {
        return driverLocationRepository.getTopMatches(limit);
    }

    /**
     * Get driver-location links with readable data
     * Returns phone numbers and location names instead of IDs
     */
    async getDriverLocationsReadable(filters: {
        location?: string;
        state?: string;
        recentDays?: number;
    }) {
        // Build query filters
        const queryFilters: any = {};

        if (filters.recentDays) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - filters.recentDays);
            queryFilters.lastSeenAfter = cutoffDate;
        }

        // Get all driver-location links with full relations
        const driverLocations = await driverLocationRepository.findMany(queryFilters);

        // Filter by location name or state if provided
        let filtered = driverLocations;

        if (filters.location) {
            filtered = filtered.filter(dl =>
                dl.location.name.toLowerCase().includes(filters.location!.toLowerCase()) ||
                (dl.location.city && dl.location.city.toLowerCase().includes(filters.location!.toLowerCase()))
            );
        }

        if (filters.state) {
            filtered = filtered.filter(dl => {
                // Extract the part after the last comma in the location name
                // Example: "134 Raymond Road Candia, New Hampshire 03034 2111, Candia, NH 03034"
                // Should extract: "NH 03034"
                const locationName = dl.location.name;
                const lastCommaIndex = locationName.lastIndexOf(',');

                if (lastCommaIndex === -1) {
                    // No comma found, check if entire string contains the state
                    return locationName.toUpperCase().includes(filters.state!.toUpperCase());
                }

                // Get everything after the last comma and trim whitespace
                const afterLastComma = locationName.substring(lastCommaIndex + 1).trim();

                // Check if this part contains the state filter (case-insensitive)
                return afterLastComma.toUpperCase().includes(filters.state!.toUpperCase());
            });
        }

        // Transform to readable format - only essential fields
        return filtered.map(dl => ({
            number: dl.driver.phoneNumber,
            location: dl.location.name,
            lastSeenAt: dl.lastSeenAt,
            createdAt: dl.createdAt,
            updatedAt: dl.updatedAt,
        }));
    }

    /**
     * Get driver-location links with readable data (PAGINATED)
     * Returns phone numbers and location names with pagination metadata
     * 
     * IMPORTANT: When location filter is applied, pagination is DISABLED
     * to show all drivers for that location on one page
     */
    async getDriverLocationsReadablePaginated(filters: {
        location?: string;
        state?: string;
        recentDays?: number;
        page: number;
        limit: number;
    }) {
        // Get all filtered data first
        const allData = await this.getDriverLocationsReadable({
            location: filters.location,
            state: filters.state,
            recentDays: filters.recentDays,
        });

        // CRITICAL FIX: If location filter is applied, show ALL results (no pagination)
        // This ensures all drivers for a specific location appear together
        if (filters.location) {
            const { paginatedResponse } = await import('../../utils/response.js');
            return paginatedResponse(
                'Driver locations retrieved successfully',
                allData, // Return ALL filtered items
                1, // Always page 1
                allData.length, // Limit = total items
                allData.length // Total items
            );
        }

        // Normal pagination for non-filtered results
        const totalItems = allData.length;
        const totalPages = Math.ceil(totalItems / filters.limit);
        const offset = (filters.page - 1) * filters.limit;
        const items = allData.slice(offset, offset + filters.limit);

        // Return paginated response using the standard helper
        const { paginatedResponse } = await import('../../utils/response.js');
        return paginatedResponse(
            'Driver locations retrieved successfully',
            items,
            filters.page,
            filters.limit,
            totalItems
        );
    }
}

export const driverService = new DriverService();
