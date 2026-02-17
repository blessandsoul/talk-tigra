/**
 * Pickup Sync Service
 *
 * Reads Google Sheet data, filters for today's pickups (column C = today's day),
 * excludes rows with CNC in column E, and upserts matching rows to the database.
 */

import { googleSheetsClient } from '../../libs/google-sheets.js';
import { env } from '../../config/env.js';
import logger from '../../libs/logger.js';
import { pickupRepo } from './pickups.repo.js';
import type { PickupRow, SyncResult } from './pickups.types.js';

class PickupSyncService {
    // Month abbreviations matching Google Sheet tab names
    private readonly MONTH_ABBREVIATIONS = [
        'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
        'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ] as const;

    // Column indices (0-based)
    private readonly VIN_COLUMN = 0;             // Column A: VIN
    private readonly PICKUP_COLUMN = 2;          // Column C: Pickup day
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
     * Sync today's pickups from Google Sheet to database
     */
    async syncPickupsToday(): Promise<SyncResult> {
        const sheetId = env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            logger.warn('[PICKUP SYNC] GOOGLE_SHEET_ID not configured, skipping');
            return { synced: 0, skipped: 0, errors: 0 };
        }

        try {
            const sheetRange = this.getCurrentSheetRange();
            const rawData = await googleSheetsClient.getSheetData(sheetId, sheetRange);

            if (!rawData || rawData.length === 0) {
                logger.warn('[PICKUP SYNC] No data found in sheet');
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

                    // Check pickup day matches today
                    if (parsed.pickupDay !== todayDay) {
                        skipped++;
                        continue;
                    }

                    await pickupRepo.upsertPickup(parsed);
                    synced++;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    logger.error({ error: message, rowIndex: i }, '[PICKUP SYNC] Failed to sync row');
                    errors++;
                }
            }

            logger.info({ synced, skipped, errors, todayDay }, '[PICKUP SYNC] Sync completed');
            return { synced, skipped, errors };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error({ error: message }, '[PICKUP SYNC] Failed to sync pickups');
            throw error;
        }
    }

    /**
     * Parse a raw sheet row into a PickupRow
     */
    private parseRow(row: unknown[], rowNumber: number): PickupRow | null {
        const vin = this.cleanString(row[this.VIN_COLUMN]);
        if (!vin || vin.length < 6) {
            return null;
        }

        const pickupValue = this.cleanString(row[this.PICKUP_COLUMN]);
        const pickupDay = parseInt(pickupValue || '', 10);
        if (isNaN(pickupDay) || pickupDay < 1 || pickupDay > 31) {
            return null;
        }

        return {
            rowNumber,
            vin,
            pickupDay,
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

export const pickupSyncService = new PickupSyncService();
