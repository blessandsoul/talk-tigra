/**
 * Delivery Sync Service
 *
 * Reads Google Sheet data, filters for today's deliveries (column D = today's day),
 * excludes rows with CNC in column E, and upserts matching rows to the database.
 */

import { googleSheetsClient } from '../../libs/google-sheets.js';
import { env } from '../../config/env.js';
import logger from '../../libs/logger.js';
import { deliveryRepo } from './deliveries.repo.js';
import type { DeliveryRow, SyncResult } from './deliveries.types.js';

class DeliverySyncService {
    // Month abbreviations matching Google Sheet tab names
    private readonly MONTH_ABBREVIATIONS = [
        'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
        'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ] as const;

    // Column indices (0-based)
    private readonly VIN_COLUMN = 0;             // Column A: VIN
    private readonly DEL_COLUMN = 3;             // Column D: DEL (delivery day)
    private readonly CNC_CHECK_COLUMN = 4;       // Column E: CNC flag
    private readonly DRIVER_PHONE_COLUMN = 6;    // Column G: Driver Phone Number

    /**
     * Get the sheet range for the current month
     * e.g., February -> 'FEB!A:Z'
     */
    private getCurrentSheetRange(): string {
        const monthIndex = new Date().getMonth();
        const monthAbbrev = this.MONTH_ABBREVIATIONS[monthIndex];
        return `${monthAbbrev}!A:Z`;
    }

    /**
     * Sync today's deliveries from Google Sheet to database
     */
    async syncDeliveriesToday(): Promise<SyncResult> {
        const sheetId = env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            logger.warn('[DELIVERY SYNC] GOOGLE_SHEET_ID not configured, skipping');
            return { synced: 0, skipped: 0, errors: 0 };
        }

        try {
            const sheetRange = this.getCurrentSheetRange();
            const rawData = await googleSheetsClient.getSheetData(sheetId, sheetRange);

            if (!rawData || rawData.length === 0) {
                logger.warn('[DELIVERY SYNC] No data found in sheet');
                return { synced: 0, skipped: 0, errors: 0 };
            }

            // Skip header row
            const dataRows = rawData.slice(1);
            const todayDay = new Date().getDate();

            let synced = 0;
            let skipped = 0;
            let errors = 0;

            for (let i = 0; i < dataRows.length; i++) {
                try {
                    const row = dataRows[i];
                    if (!row) continue;

                    const parsed = this.parseRow(row, i + 2); // +2: 1-indexed + header skip

                    if (!parsed) {
                        skipped++;
                        continue;
                    }

                    // Check CNC exclusion (column E)
                    const cncValue = this.cleanString(row[this.CNC_CHECK_COLUMN]);
                    if (cncValue && cncValue.toUpperCase() === 'CNC') {
                        skipped++;
                        continue;
                    }

                    // Check delivery day matches today
                    if (parsed.deliveryDay !== todayDay) {
                        skipped++;
                        continue;
                    }

                    await deliveryRepo.upsertDelivery(parsed);
                    synced++;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    logger.error({ error: message, rowIndex: i }, '[DELIVERY SYNC] Failed to sync row');
                    errors++;
                }
            }

            logger.info({ synced, skipped, errors, todayDay }, '[DELIVERY SYNC] Sync completed');
            return { synced, skipped, errors };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error({ error: message }, '[DELIVERY SYNC] Failed to sync deliveries');
            throw error;
        }
    }

    /**
     * Parse a raw sheet row into a DeliveryRow
     */
    private parseRow(row: unknown[], rowNumber: number): DeliveryRow | null {
        const vin = this.cleanString(row[this.VIN_COLUMN]);
        if (!vin || vin.length < 6) {
            return null;
        }

        const delValue = this.cleanString(row[this.DEL_COLUMN]);
        const deliveryDay = parseInt(delValue || '', 10);
        if (isNaN(deliveryDay) || deliveryDay < 1 || deliveryDay > 31) {
            return null;
        }

        return {
            rowNumber,
            vin,
            deliveryDay,
            driverPhone: this.normalizePhone(row[this.DRIVER_PHONE_COLUMN]),
        };
    }

    /**
     * Clean and trim a string value
     */
    private cleanString(value: unknown): string | null {
        if (value === undefined || value === null) return null;
        const cleaned = String(value).trim();
        return cleaned.length > 0 ? cleaned : null;
    }

    /**
     * Normalize phone number to E.164 format
     */
    private normalizePhone(value: unknown): string | null {
        if (!value) return null;

        const digits = String(value).replace(/\D/g, '');

        if (digits.length === 10) {
            return `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }

        return null;
    }
}

export const deliverySyncService = new DeliverySyncService();
