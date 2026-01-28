/**
 * Driver Repository
 *
 * Database access layer for Driver operations
 */

import { prisma } from '../../libs/db.js';
import { auctionLocationService } from '../../libs/auction-location.js';
import type { Driver, Location, DriverLocation } from '@prisma/client';

/**
 * Query filters for drivers
 */
export interface DriverFilters {
    locationId?: string;
    locationName?: string;
    state?: string;
    phoneNumber?: string;
}

/**
 * Driver with their locations
 */
export interface DriverWithLocations extends Driver {
    locations: Array<
        DriverLocation & {
            location: Location;
        }
    >;
}

/**
 * Driver Repository Class
 */
class DriverRepository {
    /**
     * Find driver by phone number
     */
    async findByPhoneNumber(phoneNumber: string): Promise<Driver | null> {
        return prisma.driver.findUnique({
            where: { phoneNumber },
        });
    }

    /**
     * Find driver by ID with locations
     */
    async findByIdWithLocations(
        id: string
    ): Promise<DriverWithLocations | null> {
        return prisma.driver.findUnique({
            where: { id },
            include: {
                locations: {
                    include: {
                        location: true,
                    },
                    orderBy: {
                        lastSeenAt: 'desc',
                    },
                },
            },
        });
    }

    /**
     * Get all drivers with optional filters
     */
    async findMany(filters: DriverFilters = {}): Promise<Driver[]> {
        const where: any = {};

        if (filters.phoneNumber) {
            where.phoneNumber = {
                contains: filters.phoneNumber,
            };
        }

        // Filter by location
        if (filters.locationId || filters.locationName || filters.state) {
            where.locations = {
                some: {
                    ...(filters.locationId && {
                        locationId: filters.locationId,
                    }),
                    ...(filters.locationName && {
                        location: {
                            name: {
                                contains: filters.locationName,
                            },
                        },
                    }),
                    ...(filters.state && {
                        location: {
                            state: filters.state,
                        },
                    }),
                },
            };
        }

        return prisma.driver.findMany({
            where,
            orderBy: {
                updatedAt: 'desc',
            },
        });
    }

    /**
     * Get drivers by location (with relation details)
     */
    async findByLocation(
        locationId: string
    ): Promise<
        Array<Driver & { driverLocations: Array<DriverLocation> }>
    > {
        const driverLocations = await prisma.driverLocation.findMany({
            where: { locationId },
            include: {
                driver: true,
            },
            orderBy: {
                lastSeenAt: 'desc',
            },
        });

        return driverLocations.map((dl) => ({
            ...dl.driver,
            driverLocations: [dl],
        }));
    }

    /**
     * Get drivers by location name (fuzzy match)
     */
    async findByLocationName(locationName: string): Promise<Driver[]> {
        return prisma.driver.findMany({
            where: {
                locations: {
                    some: {
                        location: {
                            OR: [
                                {
                                    name: {
                                        contains: locationName,
                                    },
                                },
                                {
                                    city: {
                                        contains: locationName,
                                    },
                                },
                                {
                                    state: {
                                        equals: locationName.toUpperCase(),
                                    },
                                },
                            ],
                        },
                    },
                },
            },
            include: {
                locations: {
                    include: {
                        location: true,
                    },
                },
            },
        });
    }

    /**
     * Get drivers by state
     */
    async findByState(state: string): Promise<Driver[]> {
        return prisma.driver.findMany({
            where: {
                locations: {
                    some: {
                        location: {
                            state: state.toUpperCase(),
                        },
                    },
                },
            },
            include: {
                locations: {
                    include: {
                        location: true,
                    },
                },
            },
        });
    }

    /**
     * Create a new driver
     */
    async create(data: {
        phoneNumber: string;
        driverNumber?: string;
        name?: string;
        companyName?: string;
        notes?: string;
    }): Promise<Driver> {
        return prisma.driver.create({
            data,
        });
    }

    /**
     * Update driver
     */
    async update(
        id: string,
        data: {
            phoneNumber?: string;
            name?: string;
            companyName?: string;
            notes?: string;
            driverNumber?: string;
        }
    ): Promise<Driver> {
        return prisma.driver.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete driver
     */
    async delete(id: string): Promise<Driver> {
        return prisma.driver.delete({
            where: { id },
        });
    }

    /**
     * Get driver statistics
     */
    async getStats(): Promise<{
        total: number;
        withLocations: number;
        recentlyActive: number;
    }> {
        const [total, withLocations, recentlyActive] = await Promise.all([
            prisma.driver.count(),
            prisma.driver.count({
                where: {
                    locations: {
                        some: {},
                    },
                },
            }),
            prisma.driver.count({
                where: {
                    locations: {
                        some: {
                            lastSeenAt: {
                                gte: new Date(
                                    Date.now() - 30 * 24 * 60 * 60 * 1000
                                ), // Last 30 days
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            total,
            withLocations,
            recentlyActive,
        };
    }
    /**
     * Create a new driver with locations
     */
    async createWithLocations(data: {
        phoneNumber: string;
        driverNumber?: string;
        name?: string;
        companyName?: string;
        notes?: string;
        locations?: Array<{ name: string; address?: string }>;
    }): Promise<Driver> {
        return prisma.$transaction(async (tx) => {
            // 1. Create Driver
            const driver = await tx.driver.create({
                data: {
                    phoneNumber: data.phoneNumber,
                    driverNumber: data.driverNumber,
                    name: data.name,
                    companyName: data.companyName,
                    notes: data.notes,
                },
            });

            // 2. Process Locations
            if (data.locations && data.locations.length > 0) {
                for (const loc of data.locations) {
                    let location = await tx.location.findUnique({
                        where: { name: loc.name },
                    });

                    if (!location) {
                        // Try to match with auction location
                        const auctionMatch = await auctionLocationService.matchAddress(loc.address || loc.name);

                        location = await tx.location.create({
                            data: {
                                name: loc.name,
                                address: loc.address,
                                auctionName: auctionMatch?.auctionName || null,
                                auctionType: auctionMatch?.auctionType || null,
                                state: auctionMatch?.state || null,
                                city: auctionMatch?.city || null,
                                zipCode: auctionMatch?.zipCode || null,
                            },
                        });
                    } else if (loc.address && location.address !== loc.address) {
                        // Try to match with auction location if not already matched
                        const auctionMatch = !location.auctionType
                            ? await auctionLocationService.matchAddress(loc.address)
                            : null;

                        location = await tx.location.update({
                            where: { id: location.id },
                            data: {
                                address: loc.address,
                                ...(auctionMatch && {
                                    auctionName: auctionMatch.auctionName,
                                    auctionType: auctionMatch.auctionType,
                                    state: auctionMatch.state,
                                    city: auctionMatch.city,
                                    zipCode: auctionMatch.zipCode,
                                }),
                            },
                        });
                    }

                    await tx.driverLocation.create({
                        data: {
                            driverId: driver.id,
                            locationId: location.id,
                            source: 'manual',
                        },
                    });
                }
            }

            return driver;
        });
    }

    /**
     * Update driver with locations
     */
    async updateWithLocations(
        id: string,
        data: {
            phoneNumber?: string;
            name?: string;
            companyName?: string;
            notes?: string;
            driverNumber?: string;
            locations?: Array<{ name: string; address?: string }>;
        }
    ): Promise<Driver> {
        return prisma.$transaction(async (tx) => {
            // 1. Update Driver
            const driver = await tx.driver.update({
                where: { id },
                data: {
                    phoneNumber: data.phoneNumber,
                    name: data.name,
                    companyName: data.companyName,
                    notes: data.notes,
                    driverNumber: data.driverNumber,
                },
            });

            // 2. Update Locations if provided
            if (data.locations) {
                // Remove all existing links for this driver to sync with new list
                await tx.driverLocation.deleteMany({
                    where: { driverId: id },
                });

                for (const loc of data.locations) {
                    let location = await tx.location.findUnique({
                        where: { name: loc.name },
                    });

                    if (!location) {
                        // Try to match with auction location
                        const auctionMatch = await auctionLocationService.matchAddress(loc.address || loc.name);

                        location = await tx.location.create({
                            data: {
                                name: loc.name,
                                address: loc.address,
                                auctionName: auctionMatch?.auctionName || null,
                                auctionType: auctionMatch?.auctionType || null,
                                state: auctionMatch?.state || null,
                                city: auctionMatch?.city || null,
                                zipCode: auctionMatch?.zipCode || null,
                            },
                        });
                    } else if (loc.address && location.address !== loc.address) {
                        // Try to match with auction location if not already matched
                        const auctionMatch = !location.auctionType
                            ? await auctionLocationService.matchAddress(loc.address)
                            : null;

                        location = await tx.location.update({
                            where: { id: location.id },
                            data: {
                                address: loc.address,
                                ...(auctionMatch && {
                                    auctionName: auctionMatch.auctionName,
                                    auctionType: auctionMatch.auctionType,
                                    state: auctionMatch.state,
                                    city: auctionMatch.city,
                                    zipCode: auctionMatch.zipCode,
                                }),
                            },
                        });
                    }

                    await tx.driverLocation.create({
                        data: {
                            driverId: driver.id,
                            locationId: location.id,
                            source: 'manual',
                        },
                    });
                }
            }

            return driver;
        });
    }

    /**
     * Upsert driver with locations (merge instead of replace)
     * - Updates company and notes (complete replacement)
     * - Adds new locations without removing existing ones
     */
    async upsertWithLocations(
        id: string,
        data: {
            phoneNumber?: string;
            name?: string;
            companyName?: string;
            notes?: string;
            driverNumber?: string;
            locations?: Array<{ name: string; address?: string }>;
        }
    ): Promise<Driver> {
        return prisma.$transaction(async (tx) => {
            // 1. Update Driver fields (company/notes are completely replaced)
            const driver = await tx.driver.update({
                where: { id },
                data: {
                    phoneNumber: data.phoneNumber,
                    name: data.name,
                    companyName: data.companyName,
                    notes: data.notes,
                    driverNumber: data.driverNumber,
                },
            });

            // 2. Add new locations (merge, don't replace)
            if (data.locations && data.locations.length > 0) {
                // Get existing location IDs for this driver
                const existingLinks = await tx.driverLocation.findMany({
                    where: { driverId: id },
                    select: { locationId: true },
                });
                const existingLocationIds = new Set(existingLinks.map(l => l.locationId));

                for (const loc of data.locations) {
                    let location = await tx.location.findUnique({
                        where: { name: loc.name },
                    });

                    if (!location) {
                        // Try to match with auction location
                        const auctionMatch = await auctionLocationService.matchAddress(loc.address || loc.name);

                        location = await tx.location.create({
                            data: {
                                name: loc.name,
                                address: loc.address,
                                auctionName: auctionMatch?.auctionName || null,
                                auctionType: auctionMatch?.auctionType || null,
                                state: auctionMatch?.state || null,
                                city: auctionMatch?.city || null,
                                zipCode: auctionMatch?.zipCode || null,
                            },
                        });
                    } else if (loc.address && location.address !== loc.address) {
                        // Try to match with auction location if not already matched
                        const auctionMatch = !location.auctionType
                            ? await auctionLocationService.matchAddress(loc.address)
                            : null;

                        location = await tx.location.update({
                            where: { id: location.id },
                            data: {
                                address: loc.address,
                                ...(auctionMatch && {
                                    auctionName: auctionMatch.auctionName,
                                    auctionType: auctionMatch.auctionType,
                                    state: auctionMatch.state,
                                    city: auctionMatch.city,
                                    zipCode: auctionMatch.zipCode,
                                }),
                            },
                        });
                    }

                    // Only create link if it doesn't already exist
                    if (!existingLocationIds.has(location.id)) {
                        await tx.driverLocation.create({
                            data: {
                                driverId: driver.id,
                                locationId: location.id,
                                source: 'manual',
                            },
                        });
                        existingLocationIds.add(location.id); // Track to avoid duplicates in same batch
                    }
                }
            }

            return driver;
        });
    }
}

export const driverRepository = new DriverRepository();
