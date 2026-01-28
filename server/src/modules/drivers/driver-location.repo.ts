/**
 * Driver Location Repository
 *
 * Database access layer for DriverLocation join table operations
 */

import { prisma } from '../../libs/db.js';
import type { DriverLocation, Driver, Location } from '@prisma/client';

/**
 * Driver Location with full relations
 */
export interface DriverLocationWithRelations extends DriverLocation {
    driver: Driver;
    location: Location;
}

/**
 * Query filters for driver-location links
 */
export interface DriverLocationFilters {
    driverId?: string;
    locationId?: string;
    source?: string;
    lastSeenAfter?: Date;
    minMatchCount?: number;
    phoneNumber?: string;
}

/**
 * Driver Location Repository Class
 */
class DriverLocationRepository {
    /**
     * Find a specific driver-location link
     */
    async findOne(
        driverId: string,
        locationId: string
    ): Promise<DriverLocationWithRelations | null> {
        return prisma.driverLocation.findUnique({
            where: {
                driverId_locationId: {
                    driverId,
                    locationId,
                },
            },
            include: {
                driver: true,
                location: true,
            },
        });
    }

    /**
     * Get all driver-location links with optional filters
     */
    async findMany(
        filters: DriverLocationFilters = {}
    ): Promise<DriverLocationWithRelations[]> {
        const where: any = {};

        if (filters.driverId) {
            where.driverId = filters.driverId;
        }

        if (filters.locationId) {
            where.locationId = filters.locationId;
        }

        if (filters.source) {
            where.source = filters.source;
        }

        if (filters.lastSeenAfter) {
            where.lastSeenAt = {
                gte: filters.lastSeenAfter,
            };
        }

        if (filters.minMatchCount) {
            where.matchCount = {
                gte: filters.minMatchCount,
            };
        }

        if (filters.phoneNumber) {
            where.driver = {
                phoneNumber: {
                    contains: filters.phoneNumber,
                },
            };
        }

        return prisma.driverLocation.findMany({
            where,
            include: {
                driver: true,
                location: true,
            },
            orderBy: {
                lastSeenAt: 'desc',
            },
        });
    }

    /**
     * Get all locations for a specific driver
     */
    async getDriverLocations(
        driverId: string
    ): Promise<DriverLocationWithRelations[]> {
        return prisma.driverLocation.findMany({
            where: { driverId },
            include: {
                driver: true,
                location: true,
            },
            orderBy: {
                lastSeenAt: 'desc',
            },
        });
    }

    /**
     * Get all drivers for a specific location
     */
    async getLocationDrivers(
        locationId: string
    ): Promise<DriverLocationWithRelations[]> {
        return prisma.driverLocation.findMany({
            where: { locationId },
            include: {
                driver: true,
                location: true,
            },
            orderBy: {
                lastSeenAt: 'desc',
            },
        });
    }

    /**
     * Create a new driver-location link
     */
    async create(data: {
        driverId: string;
        locationId: string;
        source?: string;
        matchCount?: number;
    }): Promise<DriverLocation> {
        return prisma.driverLocation.create({
            data: {
                driverId: data.driverId,
                locationId: data.locationId,
                source: data.source || 'sheet_match',
                matchCount: data.matchCount || 1,
            },
        });
    }

    /**
     * Update an existing driver-location link
     */
    async update(
        driverId: string,
        locationId: string,
        data: {
            lastSeenAt?: Date;
            matchCount?: number;
            source?: string;
        }
    ): Promise<DriverLocation> {
        return prisma.driverLocation.update({
            where: {
                driverId_locationId: {
                    driverId,
                    locationId,
                },
            },
            data,
        });
    }

    /**
     * Increment match count for a driver-location link
     */
    async incrementMatchCount(
        driverId: string,
        locationId: string
    ): Promise<DriverLocation> {
        return prisma.driverLocation.update({
            where: {
                driverId_locationId: {
                    driverId,
                    locationId,
                },
            },
            data: {
                lastSeenAt: new Date(),
                matchCount: {
                    increment: 1,
                },
            },
        });
    }

    /**
     * Delete a driver-location link
     */
    async delete(
        driverId: string,
        locationId: string
    ): Promise<DriverLocation> {
        return prisma.driverLocation.delete({
            where: {
                driverId_locationId: {
                    driverId,
                    locationId,
                },
            },
        });
    }

    /**
     * Get recently active driver-location links
     */
    async getRecentlyActive(
        days: number = 30
    ): Promise<DriverLocationWithRelations[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return prisma.driverLocation.findMany({
            where: {
                lastSeenAt: {
                    gte: cutoffDate,
                },
            },
            include: {
                driver: true,
                location: true,
            },
            orderBy: {
                lastSeenAt: 'desc',
            },
        });
    }

    /**
     * Get driver-location links by source
     */
    async getBySource(
        source: string
    ): Promise<DriverLocationWithRelations[]> {
        return prisma.driverLocation.findMany({
            where: { source },
            include: {
                driver: true,
                location: true,
            },
            orderBy: {
                matchCount: 'desc',
            },
        });
    }

    /**
     * Get statistics about driver-location links
     */
    async getStats(): Promise<{
        total: number;
        bySources: Array<{ source: string; count: number }>;
        recentlyActive: number;
        averageMatchCount: number;
    }> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        const [total, bySources, recentlyActive, averageResult] =
            await Promise.all([
                prisma.driverLocation.count(),
                prisma.driverLocation.groupBy({
                    by: ['source'],
                    _count: {
                        source: true,
                    },
                    orderBy: {
                        _count: {
                            source: 'desc',
                        },
                    },
                }),
                prisma.driverLocation.count({
                    where: {
                        lastSeenAt: {
                            gte: cutoffDate,
                        },
                    },
                }),
                prisma.driverLocation.aggregate({
                    _avg: {
                        matchCount: true,
                    },
                }),
            ]);

        return {
            total,
            bySources: bySources.map((item) => ({
                source: item.source,
                count: item._count.source,
            })),
            recentlyActive,
            averageMatchCount: averageResult._avg.matchCount || 0,
        };
    }

    /**
     * Get top driver-location pairs by match count
     */
    async getTopMatches(
        limit: number = 10
    ): Promise<DriverLocationWithRelations[]> {
        return prisma.driverLocation.findMany({
            include: {
                driver: true,
                location: true,
            },
            orderBy: {
                matchCount: 'desc',
            },
            take: limit,
        });
    }
}

export const driverLocationRepository = new DriverLocationRepository();
