/**
 * Load Inquiry Service
 *
 * Business logic for tracking which drivers texted about which loads
 */

import { loadInquiryRepo } from './load-inquiries.repo.js';
import { prisma } from '../../libs/db.js';
import logger from '../../libs/logger.js';

class LoadInquiryService {
    /**
     * Record load inquiries from a driver's conversation
     *
     * Called when message parsing extracts load IDs from a driver's texts.
     * Upserts one record per loadId+phoneNumber combo.
     */
    async recordInquiries(phoneNumber: string, loadIds: string[]): Promise<void> {
        for (const loadId of loadIds) {
            try {
                await loadInquiryRepo.upsertInquiry(loadId.toUpperCase(), phoneNumber);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                logger.error(
                    { error: message, phoneNumber, loadId },
                    '[LOAD INQUIRY] Failed to record inquiry'
                );
            }
        }

        logger.debug(
            { phoneNumber, loadIdCount: loadIds.length },
            '[LOAD INQUIRY] Recorded inquiries'
        );
    }

    /**
     * Enrich load inquiries with VIN/vehicle data from allcars sheet
     */
    async enrichLoadId(
        loadId: string,
        vin: string,
        vehicleInfo?: string | null,
        receivedIn?: string | null
    ): Promise<number> {
        return loadInquiryRepo.enrichWithVin(loadId, vin, vehicleInfo, receivedIn);
    }

    /**
     * Get all drivers who texted about a specific load ID
     * Enriches results with driver name/company from drivers table
     */
    async getByLoadId(loadId: string): Promise<unknown[]> {
        const inquiries = await loadInquiryRepo.findByLoadId(loadId.toUpperCase());
        return this.enrichWithDriverInfo(inquiries);
    }

    /**
     * Get all loads a specific driver texted about
     * Enriches results with driver name/company from drivers table
     */
    async getByPhone(phoneNumber: string): Promise<unknown[]> {
        const normalized = this.normalizePhone(phoneNumber);
        const inquiries = await loadInquiryRepo.findByPhone(normalized);
        return this.enrichWithDriverInfo(inquiries);
    }

    /**
     * Enrich inquiry records with driver name and company from drivers table
     */
    private async enrichWithDriverInfo(inquiries: Awaited<ReturnType<typeof loadInquiryRepo.findByLoadId>>): Promise<unknown[]> {
        if (inquiries.length === 0) return [];

        const phoneNumbers = [...new Set(inquiries.map((i) => i.phoneNumber))];

        const drivers = await prisma.driver.findMany({
            where: { phoneNumber: { in: phoneNumbers } },
            select: { phoneNumber: true, name: true, companyName: true },
        });

        const driverMap = new Map(drivers.map((d) => [d.phoneNumber, d]));

        return inquiries.map((inquiry) => {
            const driver = driverMap.get(inquiry.phoneNumber);
            return {
                ...inquiry,
                driverName: driver?.name || null,
                driverCompany: driver?.companyName || null,
            };
        });
    }

    /**
     * Get load inquiry stats: loads ranked by driver interest count
     */
    async getStats(page: number, limit: number): Promise<ReturnType<typeof loadInquiryRepo.getStats>> {
        return loadInquiryRepo.getStats(page, limit);
    }

    /**
     * Normalize phone number for lookups
     */
    private normalizePhone(value: string): string {
        const digits = value.replace(/\D/g, '');

        if (digits.length === 10) {
            return `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }

        // Already formatted or international
        return value;
    }
}

export const loadInquiryService = new LoadInquiryService();
