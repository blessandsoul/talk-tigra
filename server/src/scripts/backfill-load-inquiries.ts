/**
 * One-time backfill script
 *
 * Reads all existing unknown_drivers records and populates
 * load_inquiries from their stored load IDs + phone numbers.
 *
 * Safe to run multiple times — uses upsert (no duplicates).
 *
 * Usage: npx tsx src/scripts/backfill-load-inquiries.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill(): Promise<void> {
    console.log('Starting load_inquiries backfill...\n');

    const unknownDrivers = await prisma.unknownDriver.findMany();
    console.log(`Found ${unknownDrivers.length} unknown_driver records\n`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const ud of unknownDrivers) {
        try {
            const loadIds = JSON.parse(ud.loadIds) as string[];

            for (const loadId of loadIds) {
                const normalized = loadId.toUpperCase();

                const existing = await prisma.loadInquiry.findUnique({
                    where: {
                        loadId_phoneNumber: {
                            loadId: normalized,
                            phoneNumber: ud.phoneNumber,
                        },
                    },
                });

                if (existing) {
                    updated++;
                } else {
                    await prisma.loadInquiry.create({
                        data: {
                            loadId: normalized,
                            phoneNumber: ud.phoneNumber,
                            mentionCount: 1,
                            firstSeenAt: ud.createdAt,
                            lastSeenAt: ud.updatedAt,
                        },
                    });
                    created++;
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`Error processing ${ud.phoneNumber}: ${msg}`);
            errors++;
        }
    }

    console.log(`\nBackfill complete!`);
    console.log(`  Created: ${created}`);
    console.log(`  Already existed: ${updated}`);
    console.log(`  Errors: ${errors}`);

    await prisma.$disconnect();
}

backfill().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
