/**
 * Unknown Driver Matching Service
 *
 * Handles the logic for:
 * 1. Saving unknown drivers from n8n parsing
 * 2. Matching them against the loads table
 * 3. Creating driver_location records when matches are found
 */

import { prisma } from '../../libs/db.js';
import logger from '../../libs/logger.js';
import { locationNormalizer } from '../../libs/location-normalizer.js';

export class UnknownDriverService {
    /**
     * Save an unknown driver from n8n parsing
     *
     * @param phoneNumber - Driver's phone number
     * @param loadIds - Array of load IDs mentioned in conversation
     * @param rawLocation - Location extracted by AI (optional)
     */
    async saveUnknownDriver(phoneNumber: string, loadIds: string[], rawLocation?: string | null) {
        try {
            // Check if we already have this phone number with the same load IDs
            const existing = await prisma.unknownDriver.findFirst({
                where: {
                    phoneNumber,
                    matched: false,
                },
            });

            if (existing) {
                // Update with new load IDs (merge arrays)
                const existingLoadIds = JSON.parse(existing.loadIds);
                const mergedLoadIds = Array.from(new Set([...existingLoadIds, ...loadIds]));

                await prisma.unknownDriver.update({
                    where: { id: existing.id },
                    data: {
                        loadIds: JSON.stringify(mergedLoadIds),
                        rawLocation: rawLocation || existing.rawLocation,
                        updatedAt: new Date(),
                    },
                });

                logger.info({ phoneNumber, loadIds: mergedLoadIds }, 'Updated existing unknown driver');
                return existing;
            }

            // Create new unknown driver record
            const unknownDriver = await prisma.unknownDriver.create({
                data: {
                    phoneNumber,
                    loadIds: JSON.stringify(loadIds),
                    rawLocation,
                    matched: false,
                },
            });

            logger.info({ phoneNumber, loadIds }, 'Saved new unknown driver');
            return unknownDriver;
        } catch (error: any) {
            logger.error({ error: error.message, phoneNumber }, 'Failed to save unknown driver');
            throw error;
        }
    }

    /**
     * Match unknown drivers to locations based on load IDs
     *
     * This is called by the cron job every 10 minutes + on server startup
     * 
     * A driver can work in MULTIPLE locations, so we:
     * 1. Find ALL loads that match ANY of the driver's load IDs
     * 2. Create driver_location records for EACH unique location
     * 3. NEVER skip drivers - even if they're already in our database
     * 4. Only skip creating duplicate driver+location combinations
     */
    async matchUnknownDrivers() {
        const startTime = Date.now();

        try {
            // Get all unmatched unknown drivers
            const unknownDrivers = await prisma.unknownDriver.findMany({
                where: { matched: false },
            });

            logger.info(
                { count: unknownDrivers.length },
                '[DRIVER MATCH] Starting matching process for ' + unknownDrivers.length + ' unknown drivers...'
            );

            if (unknownDrivers.length === 0) {
                logger.info('[DRIVER MATCH] No unknown drivers to match');
                return { matchedCount: 0, locationsCreated: 0, totalChecked: 0 };
            }

            let matchedCount = 0;
            let locationsCreated = 0;

            for (const unknownDriver of unknownDrivers) {
                const loadIds = JSON.parse(unknownDriver.loadIds) as string[];

                logger.debug(
                    { phone: unknownDriver.phoneNumber, loadIds },
                    `[DRIVER MATCH] Checking driver ${unknownDriver.phoneNumber} with ${loadIds.length} load IDs...`
                );

                // Find ALL loads that match ANY of the driver's load IDs
                const matchedLoads = await prisma.load.findMany({
                    where: {
                        loadId: {
                            in: loadIds,
                        },
                    },
                });

                if (matchedLoads.length > 0) {
                    // Get unique locations from all matched loads
                    const uniqueLocations = new Set<string>();

                    for (const load of matchedLoads) {
                        if (load.pickupLocation) {
                            uniqueLocations.add(load.pickupLocation);
                        }
                    }

                    logger.info(
                        {
                            phone: unknownDriver.phoneNumber,
                            matchedLoadIds: matchedLoads.map(l => l.loadId),
                            locations: Array.from(uniqueLocations)
                        },
                        `[DRIVER MATCH] SUCCESS: Found ${matchedLoads.length} matching loads for driver ${unknownDriver.phoneNumber} -> ${uniqueLocations.size} locations`
                    );

                    // Create driver_location record for EACH unique location
                    // This will NOT create duplicates - createDriverLocation handles that
                    for (const locationName of uniqueLocations) {
                        const created = await this.createDriverLocation(
                            unknownDriver.phoneNumber,
                            locationName,
                            matchedLoads[0]?.loadId || 'unknown' // Just use first load ID for notes
                        );
                        if (created) locationsCreated++;
                    }

                    // Mark this unknown driver as matched
                    await prisma.unknownDriver.update({
                        where: { id: unknownDriver.id },
                        data: { matched: true },
                    });

                    matchedCount++;
                } else {
                    logger.debug(
                        { phone: unknownDriver.phoneNumber, loadIds },
                        `[DRIVER MATCH] No matching loads found for driver ${unknownDriver.phoneNumber}`
                    );
                }
            }

            const duration = Date.now() - startTime;
            logger.info(
                {
                    matchedCount,
                    locationsCreated,
                    totalChecked: unknownDrivers.length,
                    durationMs: duration,
                    durationSec: (duration / 1000).toFixed(1)
                },
                `[DRIVER MATCH] SUCCESS: Completed! Matched ${matchedCount}/${unknownDrivers.length} drivers -> Created ${locationsCreated} location links in ${(duration / 1000).toFixed(1)}s`
            );
            return { matchedCount, locationsCreated, totalChecked: unknownDrivers.length };
        } catch (error: any) {
            logger.error({ error: error.message }, '[DRIVER MATCH] ERROR: Failed to match unknown drivers');
            throw error;
        }
    }

    /**
     * Create or update driver and driver_location records
     *
     * Multi-location rule:
     * - If driver + location combo exists: update lastSeenAt and increment counter (return false)
     * - If driver exists but different location: create NEW link (return true)
     * - If driver doesn't exist: create driver + location link (return true)
     *
     * @param phoneNumber - Driver's phone number
     * @param locationName - Location name (e.g., "Miami, FL")
     * @param matchedLoadId - The load ID that caused this match
     * @returns true if new link created, false if updated existing
     */
    private async createDriverLocation(phoneNumber: string, locationName: string, matchedLoadId: string): Promise<boolean> {
        try {
            // Improvement #5: Normalize location name (handles "Miami" -> "Miami, FL", etc.)
            const normalizedLocationName = await locationNormalizer.normalizeLocation(locationName);

            // 1. Find or create the driver
            let driver = await prisma.driver.findUnique({
                where: { phoneNumber },
            });

            if (!driver) {
                driver = await prisma.driver.create({
                    data: {
                        phoneNumber,
                        notes: `Auto-created from load ID ${matchedLoadId}`,
                    },
                });
                logger.info({ phoneNumber }, 'Created new driver');
            }

            // 2. Find or create the location (using normalized name)
            let location = await prisma.location.findUnique({
                where: { name: normalizedLocationName },
            });

            if (!location) {
                // Try to parse city and state from location name
                const parts = normalizedLocationName.split(',').map((p) => p.trim());
                const city = parts[0] || null;
                const state = parts[1] || null;

                location = await prisma.location.create({
                    data: {
                        name: normalizedLocationName,
                        city,
                        state,
                    },
                });
                logger.info({ locationName: normalizedLocationName }, 'Created new location');
            }

            // 3. Create or update driver_location record
            const existing = await prisma.driverLocation.findUnique({
                where: {
                    driverId_locationId: {
                        driverId: driver.id,
                        locationId: location.id,
                    },
                },
            });

            if (existing) {
                // Update existing record (same driver, same location)
                await prisma.driverLocation.update({
                    where: {
                        driverId_locationId: {
                            driverId: driver.id,
                            locationId: location.id,
                        },
                    },
                    data: {
                        lastSeenAt: new Date(),
                        matchCount: existing.matchCount + 1,
                        source: 'n8n_match',
                    },
                });
                logger.info({ driverId: driver.id, locationId: location.id }, 'Updated driver location');
                return false; // Not a new creation
            } else {
                // Create new record (driver working in a NEW location)
                await prisma.driverLocation.create({
                    data: {
                        driverId: driver.id,
                        locationId: location.id,
                        source: 'n8n_match',
                        matchCount: 1,
                    },
                });
                logger.info({ driverId: driver.id, locationId: location.id }, 'Created driver location');
                return true; // New creation
            }
        } catch (error: any) {
            logger.error({ error: error.message, phoneNumber, locationName }, 'Failed to create driver location');
            throw error;
        }
    }
}

export const unknownDriverService = new UnknownDriverService();
