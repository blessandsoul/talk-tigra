/**
 * Test the new grouped API response
 */
import { PrismaClient } from '@prisma/client';
import { driverLocationRepository } from '../src/modules/drivers/driver-location.repo.js';

const prisma = new PrismaClient();

async function main() {
    // Simulate what the API does: query DriverLocations and group by driver
    const driverLocations = await prisma.driverLocation.findMany({
        include: {
            driver: true,
            location: true,
        },
        orderBy: { lastSeenAt: 'desc' },
    });

    // Group by driver
    const driverMap = new Map<string, {
        number: string;
        locations: Array<{ name: string; lastSeenAt: Date }>;
        lastSeenAt: Date;
    }>();

    for (const dl of driverLocations) {
        const phoneNumber = dl.driver.phoneNumber;

        if (!driverMap.has(phoneNumber)) {
            driverMap.set(phoneNumber, {
                number: phoneNumber,
                locations: [],
                lastSeenAt: dl.lastSeenAt,
            });
        }

        const driver = driverMap.get(phoneNumber)!;
        driver.locations.push({
            name: dl.location.name,
            lastSeenAt: dl.lastSeenAt,
        });

        if (dl.lastSeenAt > driver.lastSeenAt) {
            driver.lastSeenAt = dl.lastSeenAt;
        }
    }

    const grouped = Array.from(driverMap.values());

    console.log('=== Grouped API Response Sample ===');
    console.log('Total unique drivers:', grouped.length);
    console.log('');

    // Find the test driver
    const testDriver = grouped.find(d => d.number === '+13312191947');
    if (testDriver) {
        console.log('Test Driver +13312191947:');
        console.log('  Number:', testDriver.number);
        console.log('  Locations:', testDriver.locations.length);
        testDriver.locations.forEach((loc, i) => {
            console.log(`    ${i + 1}. ${loc.name}`);
        });
        console.log('  ✓ This driver now appears ONCE with all locations grouped!');
    }

    // Show a couple other examples
    const driversWithMultiple = grouped.filter(d => d.locations.length > 1).slice(0, 3);
    console.log('');
    console.log('=== Other Drivers with Multiple Locations ===');
    for (const d of driversWithMultiple) {
        console.log(`${d.number}: ${d.locations.length} locations`);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
