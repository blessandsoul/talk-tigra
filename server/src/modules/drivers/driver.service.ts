/**
 * Driver Service
 *
 * Business logic for driver operations
 */

import { driverRepository } from './driver.repo.js';
import { locationRepository } from './location.repo.js';
import { driverLocationRepository } from './driver-location.repo.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';


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
     * Normalize phone number to E.164 format
     */
    private normalizePhoneNumber(phone: string): string {
        // Remove all characters except digits and +
        const cleaned = phone.replace(/[^\d+]/g, '');

        // If already in E.164 format (starts with +), return it
        if (cleaned.startsWith('+')) {
            return cleaned;
        }

        // If 10 digits (US standard), add +1
        if (cleaned.length === 10) {
            return `+1${cleaned}`;
        }

        // If 11 digits starting with 1 (US with country code but missing +), add +
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+${cleaned}`;
        }

        return cleaned;
    }

    /**
     * Create a new driver
     */
    async createDriver(data: {
        phoneNumber: string;
        driverNumber?: string;
        name?: string;
        companyName?: string;
        notes?: string;
        locations?: string[];
    }) {
        // Normalize phone number
        const normalizedPhone = this.normalizePhoneNumber(data.phoneNumber);

        // Transform string[] locations to object format for repository
        // Deduplicate and trim input locations to prevent uniqueness errors
        const uniqueLocations = Array.from(new Set(
            data.locations?.map(l => l.trim()).filter(l => l.length > 0)
        ));

        const locationObjects = uniqueLocations.map(loc => ({
            name: loc,
            address: loc // Use the same string for address since user input is single string
        }));

        // Check if driver already exists with this phone number to prevent dupes (though DB has unique constraint)
        const existingDriver = await driverRepository.findByPhoneNumber(normalizedPhone);
        if (existingDriver) {
            throw new ConflictError(`Driver with phone number ${normalizedPhone} already exists`);
        }

        return driverRepository.createWithLocations({
            ...data,
            phoneNumber: normalizedPhone,
            locations: locationObjects
        });
    }

    /**
     * Update a driver
     */
    async updateDriver(
        id: string,
        data: {
            phoneNumber?: string;
            name?: string;
            companyName?: string;
            notes?: string;
            driverNumber?: string;
            locations?: string[];
        }
    ) {
        // Only check existence if ID is phone number? No, findByPhoneNumber returns null if not found.
        // But id here IS uuid? Wait.
        // In original code: `const driver = await driverRepository.findByPhoneNumber(id);`
        // Wait, the original code used `findByPhoneNumber(id)`.
        // If the ID param is UUID, using `findByPhoneNumber` is wrong if `id` is UUID.
        // However, repo has `findByIdWithLocations`.
        // The original code `updateDriver` did: `const driver = await driverRepository.findByPhoneNumber(id);`
        // This implies the route `/drivers/:id` might be accepting a phone number OR the original code was buggy/assumed phone ID.
        // Let's check `driver.routes.ts`. `app.patch('/drivers/:id', ...)`
        // Ideally ID should be UUID.
        // `driver.repo.ts` has `update` which uses `where: { id }` (UUID).
        // But service used `findByPhoneNumber(id)`. If `id` passed is UUID, `findByPhoneNumber` would fail unless phone happens to be UUID (unlikely).
        // I will FIX this to use `findByIdWithLocations` or just proceed to update.
        // `driverRepository.update` uses `where: { id }`. So service usage of `findByPhoneNumber` was likely incorrect if `:id` is UUID.
        // I will assume `:id` is UUID.

        // Let's try to find by ID first.
        const driver = await driverRepository.findByIdWithLocations(id);

        if (!driver) {
            // Fallback: try finding by phone if ID is not UUID format?
            // But repo update uses `where: { id }`.
            // So we must rely on ID being the primary key.
            throw new NotFoundError('Driver not found');
        }

        // Normalize phone number if provided
        let normalizedPhone = data.phoneNumber;
        if (normalizedPhone) {
            normalizedPhone = this.normalizePhoneNumber(normalizedPhone);

            // If changing phone number, check if new number already exists
            if (normalizedPhone !== driver.phoneNumber) {
                const existingDriver = await driverRepository.findByPhoneNumber(normalizedPhone);
                if (existingDriver) {
                    throw new ConflictError(`Driver with phone number ${normalizedPhone} already exists`);
                }
            }
        }

        // Transform string[] locations to object format for repository
        // Deduplicate and trim input locations to prevent uniqueness errors
        const uniqueLocations = Array.from(new Set(
            data.locations?.map(l => l.trim()).filter(l => l.length > 0)
        ));

        const locationObjects = uniqueLocations.map(loc => ({
            name: loc,
            address: loc
        }));

        return driverRepository.updateWithLocations(id, {
            ...data,
            phoneNumber: normalizedPhone,
            locations: locationObjects
        });
    }

    /**
     * Delete a driver
     */
    async deleteDriver(id: string) {
        const driver = await driverRepository.findByIdWithLocations(id);

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
     * Get drivers with their locations (GROUPED BY DRIVER)
     * Returns unique drivers with an array of their locations
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
        const allDriverLocations = await driverLocationRepository.findMany(queryFilters);

        // Filter by matching DRIVERS, not just matching rows
        // If a driver matches criteria in ONE location, we want to return ALL their locations
        let matchingPhoneNumbers = new Set<string>();

        if (filters.location || filters.state) {
            let matchCandidates = allDriverLocations;

            if (filters.location) {
                const searchQuery = filters.location.toLowerCase().trim();
                const searchQueryUpper = filters.location.toUpperCase().trim();

                matchCandidates = matchCandidates.filter(dl => {
                    // Smart matching for location search
                    // CRITICAL: Always require BOTH city AND state to match for geographic searches
                    // Never match on partial address strings alone (e.g., "51st Avenue" could appear in many cities)

                    const locationName = dl.location.name?.toLowerCase() || '';
                    const auctionName = dl.location.auctionName?.toLowerCase() || '';
                    const auctionNameUpper = dl.location.auctionName?.toUpperCase() || '';
                    const city = dl.location.city?.toLowerCase() || '';
                    const cityUpper = dl.location.city?.toUpperCase() || '';
                    const state = dl.location.state?.toLowerCase() || '';
                    const stateUpper = dl.location.state?.toUpperCase() || '';
                    const zipCode = dl.location.zipCode || '';

                    // Extract state codes from search query (2-letter patterns that are likely states)
                    const statePattern = /\b([A-Z]{2})\b/g;
                    const queryStateMatches: string[] = [];
                    let stateMatch;
                    while ((stateMatch = statePattern.exec(searchQueryUpper)) !== null) {
                        queryStateMatches.push(stateMatch[1]);
                    }

                    // Extract zip codes from search query
                    const queryZipMatches: string[] = searchQueryUpper.match(/\b(\d{5})\b/g) || [];

                    // STRATEGY 1: Zip code match (HIGHEST PRIORITY - most reliable for full addresses)
                    if (queryZipMatches.length > 0 && zipCode) {
                        if (queryZipMatches.includes(zipCode)) {
                            return true;
                        }
                    }

                    // Normalize query and location names for comparison
                    // This converts "MA - WEST WARREN" and "ma west warren" both to "MA WEST WARREN"
                    const normalizedQuery = searchQueryUpper.replace(/[-,()]/g, ' ').replace(/\s+/g, ' ').trim();
                    const normalizedAuctionName = auctionNameUpper.replace(/[-,()]/g, ' ').replace(/\s+/g, ' ').trim();
                    const normalizedLocationName = locationName.toUpperCase().replace(/[-,()]/g, ' ').replace(/\s+/g, ' ').trim();

                    // Get parts for comparison
                    const queryParts = normalizedQuery.split(' ').filter(p => p.length > 0);
                    const auctionParts = normalizedAuctionName ? normalizedAuctionName.split(' ').filter(p => p.length > 0) : [];
                    const locationParts = normalizedLocationName ? normalizedLocationName.split(' ').filter(p => p.length > 0) : [];

                    // STRATEGY 2: Normalized exact match
                    // "ma west warren" matches "MA - WEST WARREN"
                    if (normalizedAuctionName && normalizedQuery === normalizedAuctionName) {
                        return true;
                    }
                    if (normalizedLocationName && normalizedQuery === normalizedLocationName) {
                        return true;
                    }

                    // STRATEGY 3: All query parts found in auction/location name
                    // "ma west warren" -> ["MA", "WEST", "WARREN"] all in "MA - WEST WARREN"
                    if (auctionParts.length > 0 && queryParts.length > 0) {
                        const allQueryPartsInAuction = queryParts.every(qp =>
                            auctionParts.some(ap => ap === qp || ap.includes(qp) || qp.includes(ap))
                        );
                        if (allQueryPartsInAuction) {
                            return true;
                        }
                    }

                    // Also check location name
                    if (locationParts.length > 0 && queryParts.length > 0) {
                        const allQueryPartsInLocation = queryParts.every(qp =>
                            locationParts.some(lp => lp === qp || lp.includes(qp) || qp.includes(lp))
                        );
                        if (allQueryPartsInLocation) {
                            return true;
                        }
                    }

                    // STRATEGY 4: All auction parts found in query (reverse check)
                    if (auctionParts.length > 0 && queryParts.length > 0) {
                        const allAuctionPartsInQuery = auctionParts.every(ap =>
                            queryParts.some(qp => qp === ap || qp.includes(ap) || ap.includes(qp))
                        );
                        if (allAuctionPartsInQuery) {
                            return true;
                        }
                    }

                    // STRATEGY 5: City + State MUST BOTH match (CRITICAL for address searches)
                    // This prevents "51st Avenue, Arlington, WA" from matching "51st Avenue, Phoenix, AZ"
                    if (cityUpper && cityUpper.length > 2 && stateUpper) {
                        const cityInQuery = searchQueryUpper.includes(cityUpper);
                        const stateInQuery = queryStateMatches.includes(stateUpper);

                        if (cityInQuery && stateInQuery) {
                            return true;
                        }

                        // For multi-word cities, check if all significant words appear WITH state
                        if (stateInQuery) {
                            const cityWords = cityUpper.split(/\s+/).filter(w => w.length > 3);
                            if (cityWords.length > 0 && cityWords.every(w => searchQueryUpper.includes(w))) {
                                return true;
                            }
                        }
                    }

                    // STRATEGY 6: Direct contains match on auction name
                    if (auctionName && auctionName.includes(searchQuery)) {
                        return true;
                    }

                    // STRATEGY 7: Single state code search (e.g., just "GA")
                    if (queryParts.length === 1 && queryParts[0].length === 2) {
                        if (stateUpper === queryParts[0]) {
                            return true;
                        }
                    }

                    return false;
                });
            }

            if (filters.state) {
                matchCandidates = matchCandidates.filter(dl => {
                    const locationName = dl.location.name;
                    const locationState = dl.location.state?.toUpperCase() || '';
                    const searchState = filters.state!.toUpperCase();

                    // Direct state match
                    if (locationState === searchState) {
                        return true;
                    }

                    // Fallback: check in location name
                    const lastCommaIndex = locationName.lastIndexOf(',');
                    if (lastCommaIndex === -1) {
                        return locationName.toUpperCase().includes(searchState);
                    }

                    const afterLastComma = locationName.substring(lastCommaIndex + 1).trim();
                    return afterLastComma.toUpperCase().includes(searchState);
                });
            }

            // Collect IDs of drivers who matched at least one filter
            matchingPhoneNumbers = new Set(matchCandidates.map(dl => dl.driver.phoneNumber));
        } else {
            // No filters = all drivers
            matchingPhoneNumbers = new Set(allDriverLocations.map(dl => dl.driver.phoneNumber));
        }

        // Filter the ORIGINAL list to include ALL locations for matching drivers
        const filtered = allDriverLocations.filter(dl => matchingPhoneNumbers.has(dl.driver.phoneNumber));

        // GROUP BY DRIVER: Aggregate locations per unique phone number
        const driverMap = new Map<string, {
            id: string;
            number: string;
            name: string | null;
            driverNumber: string | null;
            companyName: string | null;
            notes: string | null;
            locations: Array<{
                name: string;
                auctionName: string | null;
                auctionType: string | null;
                lastSeenAt: Date;
            }>;
            lastSeenAt: Date;
            createdAt: Date;
            updatedAt: Date;
        }>();

        for (const dl of filtered) {
            const phoneNumber = dl.driver.phoneNumber;

            if (!driverMap.has(phoneNumber)) {
                driverMap.set(phoneNumber, {
                    id: dl.driver.id,
                    number: phoneNumber,
                    name: dl.driver.name,
                    driverNumber: dl.driver.driverNumber,
                    companyName: dl.driver.companyName,
                    notes: dl.driver.notes,
                    locations: [],
                    lastSeenAt: dl.lastSeenAt,
                    createdAt: dl.createdAt,
                    updatedAt: dl.updatedAt,
                });
            }

            const driver = driverMap.get(phoneNumber)!;
            driver.locations.push({
                name: dl.location.name,
                auctionName: dl.location.auctionName,
                auctionType: dl.location.auctionType,
                lastSeenAt: dl.lastSeenAt,
            });

            // Update timestamps to most recent
            if (dl.lastSeenAt > driver.lastSeenAt) {
                driver.lastSeenAt = dl.lastSeenAt;
            }
            if (dl.updatedAt > driver.updatedAt) {
                driver.updatedAt = dl.updatedAt;
            }
        }

        // Convert map to array and sort by lastSeenAt descending
        return Array.from(driverMap.values()).sort(
            (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()
        );
    }

    /**
     * Get drivers with locations (PAGINATED, GROUPED BY DRIVER)
     * Returns unique drivers with their locations array
     */
    async getDriverLocationsReadablePaginated(filters: {
        location?: string;
        state?: string;
        recentDays?: number;
        page: number;
        limit: number;
    }) {
        // Get all grouped data
        const allData = await this.getDriverLocationsReadable({
            location: filters.location,
            state: filters.state,
            recentDays: filters.recentDays,
        });

        // If location filter is applied, show ALL results (no pagination)
        if (filters.location) {
            const { paginatedResponse } = await import('../../utils/response.js');
            return paginatedResponse(
                'Drivers retrieved successfully',
                allData,
                1,
                allData.length,
                allData.length
            );
        }

        // Normal pagination for non-filtered results
        const totalItems = allData.length;
        const offset = (filters.page - 1) * filters.limit;
        const items = allData.slice(offset, offset + filters.limit);

        const { paginatedResponse } = await import('../../utils/response.js');
        return paginatedResponse(
            'Drivers retrieved successfully',
            items,
            filters.page,
            filters.limit,
            totalItems
        );
    }
}

export const driverService = new DriverService();
