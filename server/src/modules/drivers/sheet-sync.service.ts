/**
 * Sheet Sync Service
 * 
 * Syncs load data from Google Sheets to database
 */

import { googleSheetsClient } from '../../libs/google-sheets.js';
import { prisma } from '../../libs/db.js';
import { env } from '../../config/env.js';
import logger from '../../libs/logger.js';

/**
 * Expected Sheet Columns (adjust based on your actual sheet structure)
 * 
 * This interface represents the expected column structure.
 * You may need to adjust column indices based on your sheet.
 */
interface SheetRow {
    rowNumber: number;
    vin: string;
    loadId: string; // Last 6 of VIN
    pickupLocation: string | null;
    deliveryLocation: string | null;
    status: string | null;
    driverPhone: string | null;
}

/**
 * Sheet Sync Service Class
 */
class SheetSyncService {
    // Sheet configuration
    private readonly SHEET_NAME = 'JAN';       // Sheet tab name
    private readonly SHEET_RANGE = 'JAN!A:Z';  // Full range to fetch from JAN sheet

    // Column indices (0-based) - Based on your actual sheet structure
    // VIN = Column A (index 0)
    // NUM = Column G (index 6) - 7th column
    // FROM = Column H (index 7) - 8th column
    private readonly VIN_COLUMN = 0;           // Column A: VIN
    private readonly NUM_COLUMN = 6;           // Column G: NUM (7th column)
    private readonly FROM_COLUMN = 7;          // Column H: FROM (8th column - Location)
    private readonly STATUS_COLUMN = 8;        // Column I: STATUS (if exists)
    private readonly DRIVER_PHONE_COLUMN = 9;  // Column J: Driver Phone (if exists)

    /**
     * Sync all loads from Google Sheet to database
     */
    async syncLoadsFromSheet(): Promise<{ synced: number; errors: number }> {
        const sheetId = env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            logger.warn('GOOGLE_SHEET_ID not configured, skipping sheet sync');
            return { synced: 0, errors: 0 };
        }

        try {
            // Starting sync (no log needed - scheduler already logs)

            // Fetch data from JAN sheet
            const rawData = await googleSheetsClient.getSheetData(sheetId, this.SHEET_RANGE);

            if (!rawData || rawData.length === 0) {
                logger.warn('No data found in sheet');
                return { synced: 0, errors: 0 };
            }

            // Skip header row (first row)
            const dataRows = rawData.slice(1);
            // Data rows ready for processing

            let synced = 0;
            let errors = 0;

            // Process each row
            for (let i = 0; i < dataRows.length; i++) {
                try {
                    const row = dataRows[i];
                    const parsedRow = this.parseRow(row, i + 2); // +2 because: 1-indexed and skip header

                    if (parsedRow && parsedRow.vin) {
                        await this.upsertLoad(parsedRow);
                        synced++;
                    }
                } catch (error: any) {
                    logger.error({ error: error.message, rowIndex: i }, 'Failed to sync row');
                    errors++;
                }
            }

            logger.info({ synced, errors }, '[SHEET SYNC] SUCCESS: Completed');
            return { synced, errors };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to sync loads from sheet');
            throw error;
        }
    }

    /**
     * Parse a raw sheet row into structured data
     */
    private parseRow(row: any[], rowNumber: number): SheetRow | null {
        const vin = this.cleanString(row[this.VIN_COLUMN]);

        if (!vin || vin.length < 6) {
            return null; // Skip rows without valid VIN
        }

        // FROM column is the location (Column C)
        const fromLocation = this.cleanString(row[this.FROM_COLUMN]);

        return {
            rowNumber,
            vin,
            loadId: vin.slice(-6).toUpperCase(), // Last 6 characters
            pickupLocation: fromLocation,        // FROM column
            deliveryLocation: null,              // Not used from this sheet
            status: this.cleanString(row[this.STATUS_COLUMN]),
            driverPhone: this.normalizePhone(row[this.DRIVER_PHONE_COLUMN]),
        };
    }

    /**
     * Clean and trim a string value
     */
    private cleanString(value: any): string | null {
        if (value === undefined || value === null) return null;
        const cleaned = String(value).trim();
        return cleaned.length > 0 ? cleaned : null;
    }

    /**
     * Normalize phone number to E.164 format
     */
    private normalizePhone(value: any): string | null {
        if (!value) return null;

        // Remove all non-digit characters
        const digits = String(value).replace(/\D/g, '');

        if (digits.length === 10) {
            return `+1${digits}`; // Assume US number
        } else if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }

        return null;
    }

    /**
     * Upsert a load record in the database
     */
    private async upsertLoad(row: SheetRow): Promise<void> {
        await prisma.load.upsert({
            where: { vin: row.vin },
            create: {
                vin: row.vin,
                loadId: row.loadId,
                pickupLocation: row.pickupLocation,
                deliveryLocation: row.deliveryLocation,
                status: row.status,
                driverPhone: row.driverPhone,
                sheetRowNumber: row.rowNumber,
                syncedAt: new Date(),
            },
            update: {
                loadId: row.loadId,
                pickupLocation: row.pickupLocation,
                deliveryLocation: row.deliveryLocation,
                status: row.status,
                driverPhone: row.driverPhone,
                sheetRowNumber: row.rowNumber,
                syncedAt: new Date(),
            },
        });
    }

    /**
     * Find a load by its Load ID (last 6 of VIN)
     */
    async findLoadByLoadId(loadId: string): Promise<any | null> {
        const normalizedLoadId = loadId.toUpperCase().trim();

        return prisma.load.findFirst({
            where: {
                loadId: normalizedLoadId,
            },
        });
    }
}

export const sheetSyncService = new SheetSyncService();
