/**
 * Investigate specific phone number
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetPhone = '+13312191947';

    console.log(`Searching for exact match: "${targetPhone}"`);
    const exactMatches = await prisma.driver.findMany({
        where: { phoneNumber: targetPhone },
        include: { locations: { include: { location: true } } }
    });
    console.log('Exact matches found:', exactMatches.length);
    console.log(JSON.stringify(exactMatches, null, 2));

    console.log('\nSearching for partial matches (contains "3312191947")...');
    const partialMatches = await prisma.driver.findMany({
        where: { phoneNumber: { contains: '3312191947' } },
        include: { locations: { include: { location: true } } }
    });
    console.log('Partial matches found:', partialMatches.length);

    if (partialMatches.length > 0) {
        partialMatches.forEach(d => {
            console.log(`- ID: ${d.id}`);
            console.log(`  Phone: "${d.phoneNumber}"`); // Quote to see whitespace
            console.log(`  Locations: ${d.locations.length}`);
            d.locations.forEach(l => console.log(`    * ${l.location.name}`));
        });
    }

    await prisma.$disconnect();
}

main().catch(console.error);
