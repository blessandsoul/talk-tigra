/**
 * Quick check of driver data structure
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const driverCount = await prisma.driver.count();
    const dlCount = await prisma.driverLocation.count();
    const locationCount = await prisma.location.count();

    console.log('=== Database Stats ===');
    console.log('Drivers:', driverCount);
    console.log('DriverLocations (links):', dlCount);
    console.log('Locations:', locationCount);
    console.log('');

    // Get a sample driver with multiple locations
    const driverWithMultipleLocations = await prisma.driver.findFirst({
        where: {
            locations: {
                some: {},
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

    if (driverWithMultipleLocations) {
        console.log('=== Sample Driver ===');
        console.log('Phone:', driverWithMultipleLocations.phoneNumber);
        console.log('Company:', driverWithMultipleLocations.companyName);
        console.log('Notes:', driverWithMultipleLocations.notes);
        console.log('Locations:');
        for (const dl of driverWithMultipleLocations.locations) {
            console.log('  -', dl.location.name);
        }
    }

    // Check if there are drivers with multiple locations
    const driversWithMultipleLocations = await prisma.driver.findMany({
        where: {
            locations: {
                some: {},
            },
        },
        include: {
            _count: {
                select: { locations: true },
            },
        },
    });

    const withMultiple = driversWithMultipleLocations.filter(d => d._count.locations > 1);
    console.log('');
    console.log('Drivers with 2+ locations:', withMultiple.length);

    await prisma.$disconnect();
}

main().catch(console.error);
