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
    private readonly SHEET_RANGE = 'JAN!A:Z';  // Full range to fetch from JAN sheet

    // Column indices (0-based) - Based on your actual sheet structure
    // VIN = Column A (index 0)
    // NUM = Column G (index 6) - Driver Phone Number
    // FROM = Column H (index 7) - Location
    private readonly VIN_COLUMN = 0;           // Column A: VIN
    private readonly DRIVER_PHONE_COLUMN = 6;  // Column G: NUM (Driver Phone)
    private readonly FROM_COLUMN = 7;          // Column H: FROM (Location)
    private readonly STATUS_COLUMN = 8;        // Column I: STATUS (if exists)

    /**
     * Sync all loads from Google Sheet to database
     */
    async syncLoadsFromSheet(): Promise<{ synced: number; errors: number; driversCreated: number }> {
        const sheetId = env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            logger.warn('GOOGLE_SHEET_ID not configured, skipping sheet sync');
            return { synced: 0, errors: 0, driversCreated: 0 };
        }

        try {
            // Starting sync (no log needed - scheduler already logs)

            // Fetch data from JAN sheet
            const rawData = await googleSheetsClient.getSheetData(sheetId, this.SHEET_RANGE);

            if (!rawData || rawData.length === 0) {
                logger.warn('No data found in sheet');
                return { synced: 0, errors: 0, driversCreated: 0 };
            }

            // Skip header row (first row)
            const dataRows = rawData.slice(1);
            // Data rows ready for processing

            let synced = 0;
            let errors = 0;
            let driversCreated = 0;
            let rowsWithPhone = 0;

            // Process each row
            for (let i = 0; i < dataRows.length; i++) {
                try {
                    const row = dataRows[i];
                    if (!row) continue; // Skip empty rows

                    const parsedRow = this.parseRow(row, i + 2); // +2 because: 1-indexed and skip header

                    if (parsedRow && parsedRow.vin) {
                        await this.upsertLoad(parsedRow);
                        synced++;

                        // NEW: If this row has a driver phone number, create driver-location link
                        if (parsedRow.driverPhone && parsedRow.pickupLocation) {
                            rowsWithPhone++;

                            // Debug: Log first 3 rows with phone numbers
                            if (rowsWithPhone <= 3) {
                                logger.info(
                                    {
                                        rowNumber: i + 2,
                                        phone: parsedRow.driverPhone,
                                        location: parsedRow.pickupLocation,
                                        loadId: parsedRow.loadId
                                    },
                                    '[SHEET SYNC] DEBUG: Found row with phone number'
                                );
                            }

                            const created = await this.createDriverLocationFromSheet(
                                parsedRow.driverPhone,
                                parsedRow.pickupLocation,
                                parsedRow.loadId
                            );
                            if (created) driversCreated++;
                        }
                    }
                } catch (error: any) {
                    logger.error({ error: error.message, rowIndex: i }, 'Failed to sync row');
                    errors++;
                }
            }

            logger.info({ synced, errors, driversCreated, rowsWithPhone }, '[SHEET SYNC] SUCCESS: Completed');
            return { synced, errors, driversCreated };
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

    /**
     * Create driver-location link from sheet data
     * 
     * This is called when we find a driver phone number in the sheet.
     * It follows the multi-location rule:
     * - If driver + location combo already exists: just update lastSeenAt
     * - If driver exists but different location: create NEW link (keep both)
     * - If driver doesn't exist: create driver + location link
     * 
     * @returns true if a new driver-location was created, false if updated existing
     */
    private async createDriverLocationFromSheet(
        phoneNumber: string,
        locationName: string,
        loadId: string
    ): Promise<boolean> {
        try {
            // Normalize location (e.g., "Miami" -> "Miami, FL")
            const normalizedLocation = this.normalizeLocation(locationName);

            // 1. Find or create Driver
            let driver = await prisma.driver.findUnique({
                where: { phoneNumber },
            });

            if (!driver) {
                driver = await prisma.driver.create({
                    data: {
                        phoneNumber,
                        notes: `Auto-created from sheet (Load ID: ${loadId})`,
                    },
                });
                logger.info({ phoneNumber, loadId }, '[SHEET SYNC] Created new driver from sheet');
            }

            // 2. Find or create Location
            let location = await prisma.location.findUnique({
                where: { name: normalizedLocation },
            });

            if (!location) {
                // Parse city and state from location name
                const parts = normalizedLocation.split(',').map((p) => p.trim());
                const city = parts[0] || null;
                const state = parts[1] || null;

                location = await prisma.location.create({
                    data: {
                        name: normalizedLocation,
                        city,
                        state,
                    },
                });
                logger.info({ locationName: normalizedLocation }, '[SHEET SYNC] Created new location from sheet');
            }

            // 3. Check if this driver-location link already exists
            const existingLink = await prisma.driverLocation.findUnique({
                where: {
                    driverId_locationId: {
                        driverId: driver.id,
                        locationId: location.id,
                    },
                },
            });

            if (existingLink) {
                // Update existing link (same driver, same location)
                await prisma.driverLocation.update({
                    where: {
                        driverId_locationId: {
                            driverId: driver.id,
                            locationId: location.id,
                        },
                    },
                    data: {
                        lastSeenAt: new Date(),
                        matchCount: existingLink.matchCount + 1,
                        source: 'sheet_direct',
                    },
                });
                logger.debug(
                    { phoneNumber, location: normalizedLocation },
                    '[SHEET SYNC] Updated existing driver-location link'
                );
                return false; // Not a new creation
            } else {
                // Create NEW link (driver exists but working in a new location)
                await prisma.driverLocation.create({
                    data: {
                        driverId: driver.id,
                        locationId: location.id,
                        source: 'sheet_direct',
                        matchCount: 1,
                    },
                });
                logger.info(
                    { phoneNumber, location: normalizedLocation, loadId },
                    '[SHEET SYNC] Created new driver-location link from sheet'
                );
                return true; // New creation
            }
        } catch (error: any) {
            logger.error(
                { error: error.message, phoneNumber, locationName },
                '[SHEET SYNC] Failed to create driver-location from sheet'
            );
            return false;
        }
    }

    /**
     * Normalize location string
     * 
     * Examples:
     * "Miami, Florida" -> "Miami, FL"
     * "Newark NJ" -> "Newark, NJ"
     * "NJ" -> "NJ"
     */
    private normalizeLocation(rawLocation: string): string {
        const cleaned = rawLocation.trim();

        // State abbreviation map
        const stateMap: Record<string, string> = {
            'Florida': 'FL',
            'New Jersey': 'NJ',
            'New York': 'NY',
            'Texas': 'TX',
            'California': 'CA',
            'Georgia': 'GA',
            'Illinois': 'IL',
            'Pennsylvania': 'PA',
            'Ohio': 'OH',
            'Michigan': 'MI',
            'North Carolina': 'NC',
            'South Carolina': 'SC',
            'Virginia': 'VA',
            'Maryland': 'MD',
            'Massachusetts': 'MA',
            'Connecticut': 'CT',
            'Oregon': 'OR',
            'Washington': 'WA',
            'Colorado': 'CO',
            'Arizona': 'AZ',
            'Nevada': 'NV',
            'Tennessee': 'TN',
            'Kentucky': 'KY',
            'Indiana': 'IN',
            'Wisconsin': 'WI',
            'Minnesota': 'MN',
            'Missouri': 'MO',
            'Kansas': 'KS',
            'Nebraska': 'NE',
            'Iowa': 'IA',
            'Alabama': 'AL',
            'Mississippi': 'MS',
            'Louisiana': 'LA',
            'Arkansas': 'AR',
            'Oklahoma': 'OK',
            'New Hampshire': 'NH',
            'Vermont': 'VT',
            'Maine': 'ME',
            'Rhode Island': 'RI',
            'Delaware': 'DE',
            'West Virginia': 'WV',
        };

        // Pattern: "City, State" or "City State"
        const cityStatePattern = /^([A-Za-z\s]+)[,\s]+([A-Za-z]{2}|[A-Za-z\s]+)$/;
        const match = cleaned.match(cityStatePattern);

        if (match) {
            const city = match[1]!.trim();
            let state = match[2]!.trim();

            // Convert full state name to abbreviation
            if (state.length > 2) {
                state = stateMap[state] || state;
            } else {
                state = state.toUpperCase();
            }

            return `${city}, ${state}`;
        }

        // Fallback: Return as-is
        return cleaned;
    }
}

export const sheetSyncService = new SheetSyncService();

