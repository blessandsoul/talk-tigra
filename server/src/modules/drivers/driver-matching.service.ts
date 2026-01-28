/**
 * Driver Matching Service
 *
 * The Brain: Correlates SMS conversations with Load data to identify driver locations
 *
 * Process:
 * 1. Extract Load IDs from message text (partial VINs)
 * 2. Look up Load in database (synced from Google Sheets)
 * 3. Create/Update Driver record with phone number
 * 4. Create/Update Location record with normalized location
 * 5. Link Driver <-> Location with timestamp and source
 */

import { prisma } from '../../libs/db.js';
import { sheetSyncService } from './sheet-sync.service.js';
import logger from '../../libs/logger.js';

interface MatchResult {
    matched: boolean;
    driverId?: string;
    locationId?: string;
    loadId?: string;
    reason?: string;
}

/**
 * Driver Matching Service Class
 */
class DriverMatchingService {
    /**
     * Process a conversation to identify and link driver to location
     *
     * @param conversationId - The conversation ID from Quo
     * @param phoneNumber - The driver's phone number (E.164 format)
     */
    async processConversation(
        conversationId: string,
        phoneNumber: string
    ): Promise<MatchResult> {
        try {
            logger.info(
                { conversationId, phoneNumber },
                'Processing conversation for driver matching'
            );

            // Get all messages from this conversation
            const messages = await prisma.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'desc' },
                take: 50, // Process last 50 messages
            });

            if (messages.length === 0) {
                return {
                    matched: false,
                    reason: 'No messages found in conversation',
                };
            }

            // Extract all text from messages
            const conversationText = messages.map((m) => m.text).join(' ');

            // Extract Load IDs from text
            const loadIds = this.extractLoadIds(conversationText);

            if (loadIds.length === 0) {
                return {
                    matched: false,
                    reason: 'No Load IDs found in conversation',
                };
            }

            logger.info(
                { phoneNumber, loadIds: loadIds.slice(0, 5) },
                `Extracted ${loadIds.length} Load IDs from conversation`
            );

            // Try to match each Load ID
            for (const loadId of loadIds) {
                const result = await this.matchDriverToLocation(
                    phoneNumber,
                    loadId
                );

                if (result.matched) {
                    return result; // Return first successful match
                }
            }

            return {
                matched: false,
                reason: 'No matching loads found in database',
            };
        } catch (error: any) {
            logger.error(
                { error: error.message, conversationId, phoneNumber },
                'Failed to process conversation for matching'
            );
            return {
                matched: false,
                reason: `Error: ${error.message}`,
            };
        }
    }

    /**
     * Match a driver to a location based on Load ID
     *
     * @param phoneNumber - Driver's phone number
     * @param loadId - Load ID (last 6 of VIN)
     */
    async matchDriverToLocation(
        phoneNumber: string,
        loadId: string
    ): Promise<MatchResult> {
        try {
            // Look up Load in database
            const load = await sheetSyncService.findLoadByLoadId(loadId);

            if (!load) {
                logger.debug({ loadId }, 'Load not found in database');
                return {
                    matched: false,
                    reason: `Load ${loadId} not found in database`,
                };
            }

            logger.info(
                { phoneNumber, loadId, loadVin: load.vin },
                'Found matching load'
            );

            // Determine which location to use (prefer delivery, fallback to pickup)
            const rawLocation =
                load.deliveryLocation || load.pickupLocation;

            if (!rawLocation) {
                logger.warn(
                    { loadId, loadVin: load.vin },
                    'Load has no location data'
                );
                return {
                    matched: false,
                    reason: 'Load has no location information',
                };
            }

            // Normalize location
            const normalizedLocation = this.normalizeLocation(rawLocation);

            // Create or get Driver
            const driver = await this.upsertDriver(phoneNumber);

            // Create or get Location
            const location = await this.upsertLocation(normalizedLocation);

            // Link Driver <-> Location
            await this.linkDriverToLocation(driver.id, location.id);

            // Optionally: Link Driver to Load
            await prisma.load.update({
                where: { id: load.id },
                data: { driverId: driver.id },
            });

            logger.info(
                {
                    driverId: driver.id,
                    locationId: location.id,
                    phoneNumber,
                    location: normalizedLocation.name,
                    loadId,
                },
                'Successfully matched driver to location'
            );

            return {
                matched: true,
                driverId: driver.id,
                locationId: location.id,
                loadId,
            };
        } catch (error: any) {
            logger.error(
                { error: error.message, phoneNumber, loadId },
                'Failed to match driver to location'
            );
            throw error;
        }
    }

    /**
     * Extract Load IDs from text
     *
     * Patterns we look for:
     * - 6-digit sequences (last 6 of VIN)
     * - Alphanumeric codes like "17641", "AB1234"
     * - Common phrases: "load 123456", "VIN ending in 123456"
     *
     * @param text - Raw text from messages
     * @returns Array of potential Load IDs
     */
    private extractLoadIds(text: string): string[] {
        const loadIds = new Set<string>();

        // Pattern 1: 6-character alphanumeric sequences (most common)
        const sixCharPattern = /\b([A-Z0-9]{6})\b/gi;
        const sixCharMatches = text.matchAll(sixCharPattern);

        for (const match of sixCharMatches) {
            loadIds.add(match[1].toUpperCase());
        }

        // Pattern 2: "load XXXXXX" or "Load ID: XXXXXX"
        const loadPhrasePattern = /load\s*(?:id)?[:\s]*([A-Z0-9]{4,6})/gi;
        const loadPhraseMatches = text.matchAll(loadPhrasePattern);

        for (const match of loadPhraseMatches) {
            const id = match[1].toUpperCase();
            if (id.length === 6) {
                loadIds.add(id);
            }
        }

        // Pattern 3: "VIN ending in XXXXXX" or "last 6: XXXXXX"
        const vinPattern = /(?:vin|last\s*6)[:\s]*([A-Z0-9]{6})/gi;
        const vinMatches = text.matchAll(vinPattern);

        for (const match of vinMatches) {
            loadIds.add(match[1].toUpperCase());
        }

        // Pattern 4: 5-digit numbers (less strict, but common)
        const fiveDigitPattern = /\b(\d{5})\b/g;
        const fiveDigitMatches = text.matchAll(fiveDigitPattern);

        for (const match of fiveDigitMatches) {
            // Pad with leading zero to make 6 digits
            loadIds.add('0' + match[1]);
        }

        return Array.from(loadIds);
    }

    /**
     * Normalize location string
     *
     * Examples:
     * "Miami, Florida" -> { name: "Miami, FL", city: "Miami", state: "FL" }
     * "Newark NJ" -> { name: "Newark, NJ", city: "Newark", state: "NJ" }
     * "NJ" -> { name: "NJ", state: "NJ" }
     * "33101" -> { name: "33101", zipCode: "33101" }
     */
    private normalizeLocation(rawLocation: string): {
        name: string;
        city?: string;
        state?: string;
        zipCode?: string;
    } {
        const cleaned = rawLocation.trim();

        // State abbreviation map
        const stateMap: Record<string, string> = {
            Florida: 'FL',
            'New Jersey': 'NJ',
            'New York': 'NY',
            Texas: 'TX',
            California: 'CA',
            Georgia: 'GA',
            Illinois: 'IL',
            Pennsylvania: 'PA',
            Ohio: 'OH',
            Michigan: 'MI',
            // Add more as needed
        };

        // Pattern 1: Zip code (5 digits)
        if (/^\d{5}$/.test(cleaned)) {
            return {
                name: cleaned,
                zipCode: cleaned,
            };
        }

        // Pattern 2: State abbreviation only (e.g., "NJ", "FL")
        if (/^[A-Z]{2}$/i.test(cleaned)) {
            const state = cleaned.toUpperCase();
            return {
                name: state,
                state,
            };
        }

        // Pattern 3: "City, State" or "City State"
        const cityStatePattern =
            /^([A-Za-z\s]+)[,\s]+([A-Za-z]{2}|[A-Za-z\s]+)$/;
        const match = cleaned.match(cityStatePattern);

        if (match) {
            const city = match[1].trim();
            let state = match[2].trim();

            // Convert full state name to abbreviation
            if (state.length > 2) {
                state = stateMap[state] || state;
            } else {
                state = state.toUpperCase();
            }

            return {
                name: `${city}, ${state}`,
                city,
                state,
            };
        }

        // Fallback: Return as-is
        return {
            name: cleaned,
        };
    }

    /**
     * Create or get Driver record
     */
    private async upsertDriver(phoneNumber: string) {
        return prisma.driver.upsert({
            where: { phoneNumber },
            create: {
                phoneNumber,
                companyName: '', // Initialize as empty string for manual entry later
                notes: '', // Initialize as empty string for manual entry later
            },
            update: {
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Create or get Location record
     */
    private async upsertLocation(location: {
        name: string;
        city?: string;
        state?: string;
        zipCode?: string;
    }) {
        return prisma.location.upsert({
            where: { name: location.name },
            create: location,
            update: {
                city: location.city,
                state: location.state,
                zipCode: location.zipCode,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Link Driver to Location (or update if exists)
     */
    private async linkDriverToLocation(
        driverId: string,
        locationId: string
    ) {
        // Check if link already exists
        const existing = await prisma.driverLocation.findUnique({
            where: {
                driverId_locationId: {
                    driverId,
                    locationId,
                },
            },
        });

        if (existing) {
            // Update lastSeenAt and increment match count
            await prisma.driverLocation.update({
                where: {
                    driverId_locationId: {
                        driverId,
                        locationId,
                    },
                },
                data: {
                    lastSeenAt: new Date(),
                    matchCount: {
                        increment: 1,
                    },
                },
            });
        } else {
            // Create new link
            await prisma.driverLocation.create({
                data: {
                    driverId,
                    locationId,
                    source: 'sheet_match',
                    matchCount: 1,
                },
            });
        }
    }

    /**
     * Batch process all recent conversations
     *
     * Runs through all conversations from the last N days and attempts matching
     *
     * @param daysSince - How many days back to process (default: 7)
     */
    async batchProcessRecentConversations(
        daysSince: number = 7
    ): Promise<{
        processed: number;
        matched: number;
        failed: number;
    }> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysSince);

        logger.info({ daysSince, cutoffDate }, 'Starting batch processing');

        const conversations = await prisma.conversation.findMany({
            where: {
                lastActivityAt: {
                    gte: cutoffDate,
                },
            },
            select: {
                id: true,
                participants: true,
            },
        });

        logger.info(
            { conversationCount: conversations.length },
            'Found conversations to process'
        );

        let processed = 0;
        let matched = 0;
        let failed = 0;

        for (const conversation of conversations) {
            try {
                // Extract driver phone number from participants
                const participants = JSON.parse(
                    conversation.participants
                ) as string[];

                // Assume the first participant that's not our business number is the driver
                // You may need to adjust this logic based on your setup
                const driverPhone = participants.find(
                    (p) => p !== process.env.QUO_BUSINESS_PHONE_NUMBER
                );

                if (!driverPhone) {
                    continue;
                }

                const result = await this.processConversation(
                    conversation.id,
                    driverPhone
                );

                processed++;

                if (result.matched) {
                    matched++;
                } else {
                    failed++;
                }
            } catch (error: any) {
                logger.error(
                    { error: error.message, conversationId: conversation.id },
                    'Failed to process conversation in batch'
                );
                failed++;
            }
        }

        logger.info(
            { processed, matched, failed },
            'Batch processing completed'
        );

        return { processed, matched, failed };
    }
}

export const driverMatchingService = new DriverMatchingService();
