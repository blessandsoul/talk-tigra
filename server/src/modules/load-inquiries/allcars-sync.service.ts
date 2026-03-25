/**
 * Allcars Sheet Sync Service
 *
 * Syncs VIN/vehicle data from the "allcars" Google Sheet (year-based tabs)
 * and enriches load_inquiries with full VIN, vehicle info, and destination.
 * Also upserts VINs into the loads table so driver-matching can find them.
 */

import { googleSheetsClient } from '../../libs/google-sheets.js';
import { prisma } from '../../libs/db.js';
import { env } from '../../config/env.js';
import logger from '../../libs/logger.js';
import { loadInquiryService } from './load-inquiries.service.js';

class AllcarsSyncService {
    // Column indices (0-based) for allcars sheet
    private readonly DATE_COLUMN = 0;           // Column A: Date (e.g., "1 January")
    private readonly VEHICLE_INFO_COLUMN = 2;   // Column C: Year Make Model
    private readonly VIN_COLUMN = 3;            // Column D: VIN
    private readonly RECEIVED_IN_COLUMN = 4;    // Column E: Received in (destination)

    /**
     * Get the sheet tab name for the current year
     * e.g., 2026 -> '2026'
     */
    private getCurrentYearTab(): string {
        return new Date().getFullYear().toString();
    }

    /**
     * Sync all VINs from the allcars sheet to database
     */
    async syncFromAllcars(): Promise<{ synced: number; enriched: number; errors: number }> {
        const sheetId = env.GOOGLE_ALLCARS_SHEET_ID;

        if (!sheetId) {
            logger.warn('[ALLCARS SYNC] GOOGLE_ALLCARS_SHEET_ID not configured, skipping');
            return { synced: 0, enriched: 0, errors: 0 };
        }

        try {
            const yearTab = this.getCurrentYearTab();
            const sheetRange = `'${yearTab}'!A:Z`;

            logger.info({ yearTab, sheetRange }, '[ALLCARS SYNC] Starting sync...');

            const rawData = await googleSheetsClient.getSheetData(sheetId, sheetRange);

            if (!rawData || rawData.length === 0) {
                logger.warn('[ALLCARS SYNC] No data found in sheet');
                return { synced: 0, enriched: 0, errors: 0 };
            }

            // Skip header row
            const dataRows = rawData.slice(1);

            let synced = 0;
            let enriched = 0;
            let errors = 0;

            for (let i = 0; i < dataRows.length; i++) {
                try {
                    const row = dataRows[i];
                    if (!row) continue;

                    const vin = this.cleanString(row[this.VIN_COLUMN]);

                    // Skip rows without valid VIN (at least 6 chars for load ID)
                    if (!vin || vin.length < 6) continue;

                    const loadId = vin.slice(-6).toUpperCase();
                    const vehicleInfo = this.cleanString(row[this.VEHICLE_INFO_COLUMN]);
                    const receivedIn = this.cleanString(row[this.RECEIVED_IN_COLUMN]);

                    // Upsert into loads table so driver-matching flow works
                    await this.upsertLoad(vin, loadId, receivedIn, i + 2);
                    synced++;

                    // Enrich any existing load_inquiries with VIN/vehicle data
                    const enrichCount = await loadInquiryService.enrichLoadId(
                        loadId,
                        vin,
                        vehicleInfo,
                        receivedIn
                    );
                    if (enrichCount > 0) enriched += enrichCount;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    logger.error({ error: message, rowIndex: i }, '[ALLCARS SYNC] Failed to sync row');
                    errors++;
                }
            }

            logger.info(
                { synced, enriched, errors, totalRows: dataRows.length },
                '[ALLCARS SYNC] Completed'
            );
            return { synced, enriched, errors };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error({ error: message }, '[ALLCARS SYNC] Failed to sync from allcars sheet');
            throw error;
        }
    }

    /**
     * Upsert a load record from allcars data
     *
     * Uses the existing loads table so driver-matching can find allcars VINs
     */
    private async upsertLoad(
        vin: string,
        loadId: string,
        receivedIn: string | null,
        rowNumber: number
    ): Promise<void> {
        await prisma.load.upsert({
            where: { vin },
            create: {
                vin,
                loadId,
                pickupLocation: receivedIn,
                sheetRowNumber: rowNumber,
                syncedAt: new Date(),
            },
            update: {
                loadId,
                // Only update pickupLocation from allcars if not already set by CentralDispatch
                pickupLocation: receivedIn,
                sheetRowNumber: rowNumber,
                syncedAt: new Date(),
            },
        });
    }

    /**
     * Clean and trim a string value
     */
    private cleanString(value: unknown): string | null {
        if (value === undefined || value === null) return null;
        const cleaned = String(value).trim().replace(/\r/g, '');
        return cleaned.length > 0 ? cleaned : null;
    }
}

export const allcarsSyncService = new AllcarsSyncService();
