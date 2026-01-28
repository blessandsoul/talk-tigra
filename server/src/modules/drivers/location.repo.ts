/**
 * Location Repository
 *
 * Database access layer for Location operations
 */

import { prisma } from '../../libs/db.js';
import { auctionLocationService } from '../../libs/auction-location.js';
import type { Location, DriverLocation, Driver } from '@prisma/client';

/**
 * Query filters for locations
 */
export interface LocationFilters {
    state?: string;
    city?: string;
    name?: string;
}

/**
 * Location with driver count
 */
export interface LocationWithDriverCount extends Location {
    _count: {
        drivers: number;
    };
}

/**
 * Location with drivers
 */
export interface LocationWithDrivers extends Location {
    drivers: Array<
        DriverLocation & {
            driver: Driver;
        }
    >;
}

/**
 * Location Repository Class
 */
class LocationRepository {
    /**
     * Find location by name
     */
    async findByName(name: string): Promise<Location | null> {
        return prisma.location.findUnique({
            where: { name },
        });
    }

    /**
     * Find location by ID
     */
    async findById(id: string): Promise<Location | null> {
        return prisma.location.findUnique({
            where: { id },
        });
    }

    /**
     * Find location by ID with drivers
     */
    async findByIdWithDrivers(
        id: string
    ): Promise<LocationWithDrivers | null> {
        return prisma.location.findUnique({
            where: { id },
            include: {
                drivers: {
                    include: {
                        driver: true,
                    },
                    orderBy: {
                        lastSeenAt: 'desc',
                    },
                },
            },
        });
    }

    /**
     * Get all locations with optional filters
     */
    async findMany(
        filters: LocationFilters = {}
    ): Promise<LocationWithDriverCount[]> {
        const where: any = {};

        if (filters.state) {
            where.state = {
                equals: filters.state.toUpperCase(),
            };
        }

        if (filters.city) {
            where.city = {
                contains: filters.city,
            };
        }

        if (filters.name) {
            where.name = {
                contains: filters.name,
            };
        }

        return prisma.location.findMany({
            where,
            include: {
                _count: {
                    select: {
                        drivers: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    /**
     * Search locations by partial match
     */
    async search(query: string): Promise<LocationWithDriverCount[]> {
        return prisma.location.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: query,
                        },
                    },
                    {
                        city: {
                            contains: query,
                        },
                    },
                    {
                        state: {
                            equals: query.toUpperCase(),
                        },
                    },
                    {
                        zipCode: {
                            contains: query,
                        },
                    },
                ],
            },
            include: {
                _count: {
                    select: {
                        drivers: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    /**
     * Get locations by state
     */
    async findByState(state: string): Promise<LocationWithDriverCount[]> {
        return prisma.location.findMany({
            where: {
                state: state.toUpperCase(),
            },
            include: {
                _count: {
                    select: {
                        drivers: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    /**
     * Create a new location
     */
    async create(data: {
        name: string;
        city?: string;
        state?: string;
        zipCode?: string;
        address?: string;
    }): Promise<Location> {
        // Try to match with auction location
        const auctionMatch = await auctionLocationService.matchAddress(data.address || data.name);

        return prisma.location.create({
            data: {
                ...data,
                auctionName: auctionMatch?.auctionName || null,
                auctionType: auctionMatch?.auctionType || null,
                state: data.state || auctionMatch?.state || null,
                city: data.city || auctionMatch?.city || null,
                zipCode: data.zipCode || auctionMatch?.zipCode || null,
            },
        });
    }

    /**
     * Update location
     */
    async update(
        id: string,
        data: {
            name?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            address?: string;
        }
    ): Promise<Location> {
        // Check if location already has auction info
        const existing = await prisma.location.findUnique({ where: { id } });

        // Try to match with auction location if not already matched and address is being updated
        const auctionMatch = (!existing?.auctionType && data.address)
            ? await auctionLocationService.matchAddress(data.address)
            : null;

        return prisma.location.update({
            where: { id },
            data: {
                ...data,
                ...(auctionMatch && {
                    auctionName: auctionMatch.auctionName,
                    auctionType: auctionMatch.auctionType,
                    state: data.state || auctionMatch.state,
                    city: data.city || auctionMatch.city,
                    zipCode: data.zipCode || auctionMatch.zipCode,
                }),
            },
        });
    }

    /**
     * Delete location
     */
    async delete(id: string): Promise<Location> {
        return prisma.location.delete({
            where: { id },
        });
    }

    /**
     * Get location statistics
     */
    async getStats(): Promise<{
        total: number;
        withDrivers: number;
        byState: Array<{ state: string; count: number }>;
    }> {
        const [total, withDrivers, byState] = await Promise.all([
            prisma.location.count(),
            prisma.location.count({
                where: {
                    drivers: {
                        some: {},
                    },
                },
            }),
            prisma.location.groupBy({
                by: ['state'],
                _count: {
                    state: true,
                },
                where: {
                    state: {
                        not: null,
                    },
                },
                orderBy: {
                    _count: {
                        state: 'desc',
                    },
                },
            }),
        ]);

        return {
            total,
            withDrivers,
            byState: byState.map((item) => ({
                state: item.state || 'Unknown',
                count: item._count.state,
            })),
        };
    }

    /**
     * Get top locations by driver count
     */
    async getTopLocations(
        limit: number = 10
    ): Promise<LocationWithDriverCount[]> {
        const locations = await prisma.location.findMany({
            include: {
                _count: {
                    select: {
                        drivers: true,
                    },
                },
            },
            orderBy: {
                drivers: {
                    _count: 'desc',
                },
            },
            take: limit,
        });

        return locations;
    }
}

export const locationRepository = new LocationRepository();
