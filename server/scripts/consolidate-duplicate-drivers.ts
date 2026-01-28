/**
 * Consolidate Duplicate Drivers Script
 *
 * This script finds all duplicate phone numbers in the drivers table
 * and merges them into single records, combining their locations.
 *
 * Run with: npx tsx scripts/consolidate-duplicate-drivers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
    phoneNumber: string;
    count: number;
}

async function main() {
    console.log('='.repeat(60));
    console.log('Driver Deduplication Script');
    console.log('='.repeat(60));
    console.log('');

    // Step 1: Find all duplicate phone numbers
    console.log('Step 1: Finding duplicate phone numbers...');

    const duplicates = await prisma.$queryRaw<DuplicateGroup[]>`
        SELECT phone_number as phoneNumber, COUNT(*) as count
        FROM drivers
        GROUP BY phone_number
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    `;

    if (duplicates.length === 0) {
        console.log('✓ No duplicate phone numbers found. Database is clean!');
        return;
    }

    console.log(`Found ${duplicates.length} phone numbers with duplicates`);
    console.log('');

    let totalMerged = 0;
    let totalLocationsMoved = 0;

    // Step 2: Process each duplicate group
    for (const dup of duplicates) {
        const phoneNumber = dup.phoneNumber;
        const count = Number(dup.count);

        console.log(`Processing: ${phoneNumber} (${count} records)`);

        // Get all driver records with this phone number
        const drivers = await prisma.driver.findMany({
            where: { phoneNumber },
            include: {
                locations: {
                    include: {
                        location: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' }, // Keep the oldest one
        });

        if (drivers.length <= 1) {
            console.log(`  Skipped: Only ${drivers.length} record found`);
            continue;
        }

        // Keep the first (oldest) driver
        const keepDriver = drivers[0];
        const duplicateDrivers = drivers.slice(1);

        console.log(`  Keeping driver ID: ${keepDriver.id} (created: ${keepDriver.createdAt.toISOString()})`);

        // Collect all unique location IDs from the kept driver
        const existingLocationIds = new Set(
            keepDriver.locations.map((dl) => dl.locationId)
        );

        // Move locations from duplicate drivers to the kept driver
        for (const dupDriver of duplicateDrivers) {
            for (const driverLocation of dupDriver.locations) {
                if (!existingLocationIds.has(driverLocation.locationId)) {
                    // Move this location link to the kept driver
                    try {
                        await prisma.driverLocation.update({
                            where: {
                                driverId_locationId: {
                                    driverId: dupDriver.id,
                                    locationId: driverLocation.locationId,
                                },
                            },
                            data: {
                                driverId: keepDriver.id,
                            },
                        });
                        existingLocationIds.add(driverLocation.locationId);
                        totalLocationsMoved++;
                        console.log(`  Moved location: ${driverLocation.location.name}`);
                    } catch (error) {
                        // If update fails (e.g., constraint violation), delete the duplicate link
                        await prisma.driverLocation.delete({
                            where: {
                                driverId_locationId: {
                                    driverId: dupDriver.id,
                                    locationId: driverLocation.locationId,
                                },
                            },
                        });
                        console.log(`  Removed duplicate location link: ${driverLocation.location.name}`);
                    }
                } else {
                    // Location already exists on kept driver, delete the duplicate link
                    await prisma.driverLocation.delete({
                        where: {
                            driverId_locationId: {
                                driverId: dupDriver.id,
                                locationId: driverLocation.locationId,
                            },
                        },
                    });
                    console.log(`  Removed duplicate location link: ${driverLocation.location.name}`);
                }
            }

            // Merge non-empty fields from duplicate to kept driver
            const updates: any = {};
            if (dupDriver.name && !keepDriver.name) {
                updates.name = dupDriver.name;
            }
            if (dupDriver.companyName && !keepDriver.companyName) {
                updates.companyName = dupDriver.companyName;
            }
            if (dupDriver.driverNumber && !keepDriver.driverNumber) {
                updates.driverNumber = dupDriver.driverNumber;
            }
            if (dupDriver.notes && !keepDriver.notes) {
                updates.notes = dupDriver.notes;
            }

            if (Object.keys(updates).length > 0) {
                await prisma.driver.update({
                    where: { id: keepDriver.id },
                    data: updates,
                });
                console.log(`  Merged fields: ${Object.keys(updates).join(', ')}`);
            }

            // Delete the duplicate driver
            await prisma.driver.delete({
                where: { id: dupDriver.id },
            });
            totalMerged++;
            console.log(`  Deleted duplicate driver ID: ${dupDriver.id}`);
        }

        console.log('');
    }

    // Final summary
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Phone numbers deduplicated: ${duplicates.length}`);
    console.log(`Duplicate records removed: ${totalMerged}`);
    console.log(`Locations moved/consolidated: ${totalLocationsMoved}`);

    // Verify final count
    const finalCount = await prisma.driver.count();
    console.log(`Total drivers remaining: ${finalCount}`);

    console.log('');
    console.log('✓ Deduplication complete!');
}

main()
    .catch((error) => {
        console.error('Error during deduplication:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
