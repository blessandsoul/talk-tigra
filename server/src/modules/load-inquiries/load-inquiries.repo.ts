/**
 * Load Inquiry Repository
 *
 * Database operations for load inquiry tracking
 */

import { prisma } from '../../libs/db.js';
import type { LoadInquiryStatsItem } from './load-inquiries.types.js';

class LoadInquiryRepo {
    /**
     * Upsert a load inquiry record
     *
     * If the driver+loadId combo exists: increment mentionCount, update lastSeenAt
     * If new: create with mentionCount = 1
     */
    async upsertInquiry(loadId: string, phoneNumber: string): Promise<void> {
        await prisma.loadInquiry.upsert({
            where: {
                loadId_phoneNumber: { loadId, phoneNumber },
            },
            create: {
                loadId,
                phoneNumber,
                mentionCount: 1,
                firstSeenAt: new Date(),
                lastSeenAt: new Date(),
            },
            update: {
                mentionCount: { increment: 1 },
                lastSeenAt: new Date(),
            },
        });
    }

    /**
     * Enrich all inquiry records for a loadId with VIN/vehicle data from allcars
     * Only updates records where vin is currently null
     */
    async enrichWithVin(
        loadId: string,
        vin: string,
        vehicleInfo?: string | null,
        receivedIn?: string | null
    ): Promise<number> {
        const result = await prisma.loadInquiry.updateMany({
            where: {
                loadId,
                vin: null,
            },
            data: {
                vin,
                vehicleInfo: vehicleInfo ?? undefined,
                receivedIn: receivedIn ?? undefined,
            },
        });
        return result.count;
    }

    /**
     * Find all inquiries for a specific load ID
     */
    async findByLoadId(loadId: string): Promise<ReturnType<typeof prisma.loadInquiry.findMany>> {
        return prisma.loadInquiry.findMany({
            where: { loadId },
            orderBy: { mentionCount: 'desc' },
        });
    }

    /**
     * Find all inquiries for a specific phone number
     */
    async findByPhone(phoneNumber: string): Promise<ReturnType<typeof prisma.loadInquiry.findMany>> {
        return prisma.loadInquiry.findMany({
            where: { phoneNumber },
            orderBy: { lastSeenAt: 'desc' },
        });
    }

    /**
     * Get load inquiry stats: loads ranked by number of interested drivers
     *
     * Uses raw query for GROUP BY with aggregation
     */
    async getStats(page: number, limit: number): Promise<{ items: LoadInquiryStatsItem[]; totalItems: number }> {
        const offset = (page - 1) * limit;

        // Get total unique load IDs
        const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(DISTINCT load_id) as count FROM load_inquiries
        `;
        const totalItems = Number(countResult[0]?.count ?? 0);

        // Get stats with pagination
        const items = await prisma.$queryRaw<LoadInquiryStatsItem[]>`
            SELECT
                li.load_id as loadId,
                MAX(li.vin) as vin,
                MAX(li.vehicle_info) as vehicleInfo,
                MAX(li.received_in) as receivedIn,
                COUNT(DISTINCT li.phone_number) as driverCount,
                SUM(li.mention_count) as totalMentions,
                MAX(li.last_seen_at) as latestInquiry
            FROM load_inquiries li
            GROUP BY li.load_id
            ORDER BY driverCount DESC, totalMentions DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        // Convert BigInt values from MySQL to numbers
        const formattedItems = items.map((item) => ({
            ...item,
            driverCount: Number(item.driverCount),
            totalMentions: Number(item.totalMentions),
        }));

        return { items: formattedItems, totalItems };
    }
}

export const loadInquiryRepo = new LoadInquiryRepo();
