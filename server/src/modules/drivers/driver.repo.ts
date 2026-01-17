/**
 * Driver Repository
 *
 * Database access layer for Driver operations
 */

import { prisma } from '../../libs/db.js';
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
            name?: string;
            companyName?: string;
            notes?: string;
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
}

export const driverRepository = new DriverRepository();
