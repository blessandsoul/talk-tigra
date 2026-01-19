/**
 * Driver Sync Scheduler
 *
 * Coordinates two critical jobs:
 * 1. Sheet Sync: Syncs load data from Google Sheets
 * 2. Driver Matching: Correlates messages with loads to identify driver locations
 */

import cron from 'node-cron';
import { sheetSyncService } from '../modules/drivers/sheet-sync.service.js';
import { driverMatchingService } from '../modules/drivers/driver-matching.service.js';
import logger from './logger.js';
import { env } from '../config/env.js';

/**
 * Start the Driver Sync Scheduler
 *
 * Runs two jobs:
 * - Sheet sync every 10 minutes
 * - Driver matching every 10 minutes (offset by 5 minutes)
 */
export function startDriverSyncScheduler(): void {
    const sheetId = env.GOOGLE_SHEET_ID;

    if (!sheetId) {
        logger.warn(
            'GOOGLE_SHEET_ID not configured, driver sync scheduler will not start'
        );
        return;
    }

    logger.info('[SHEET SYNC] Starting driver sync scheduler...');

    // ============================================================
    // Job 1: Sheet Sync (runs every 10 minutes)
    // ============================================================

    // Run sheet sync immediately on startup
    sheetSyncService.syncLoadsFromSheet().catch((error) => {
        logger.error({ error: error.message }, '[SHEET SYNC] ERROR: Initial sync failed');
    });

    // Schedule sheet sync every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        try {
            await sheetSyncService.syncLoadsFromSheet();
        } catch (error: any) {
            logger.error({ error: error.message }, '[SHEET SYNC] ERROR: Scheduled sync failed');
        }
    });

    // ============================================================
    // Job 2: Driver Matching (runs every 10 minutes, offset by 5)
    // ============================================================

    // Run initial matching after 2 minutes (gives sheet sync time to complete)
    setTimeout(() => {
        driverMatchingService
            .batchProcessRecentConversations(7) // Process last 7 days
            .catch((error) => {
                logger.error(
                    { error: error.message },
                    '[DRIVER MATCHING] ERROR: Initial matching failed'
                );
            });
    }, 2 * 60 * 1000); // 2 minutes delay

    // Schedule driver matching every 10 minutes, offset by 5 minutes
    cron.schedule('5,15,25,35,45,55 * * * *', async () => {
        try {
            const result =
                await driverMatchingService.batchProcessRecentConversations(7);
            logger.info(
                { processed: result.processed, matched: result.matched },
                '[DRIVER MATCHING] SUCCESS: Completed'
            );
        } catch (error: any) {
            logger.error(
                { error: error.message },
                '[DRIVER MATCHING] ERROR: Scheduled matching failed'
            );
        }
    });

    logger.info('[SHEET SYNC] Driver sync scheduler started');
}

/**
 * Manual trigger: Run sheet sync + driver matching immediately
 *
 * Useful for testing or manual data refresh
 */
export async function runDriverSyncManually(): Promise<{
    sheetSync: { synced: number; errors: number; driversCreated: number };
    driverMatching: { processed: number; matched: number; failed: number };
}> {
    logger.info('Running manual driver sync');

    // Step 1: Sync sheet
    const sheetResult = await sheetSyncService.syncLoadsFromSheet();
    logger.info({ sheetResult }, 'Manual sheet sync completed');

    // Step 2: Wait 5 seconds for DB to settle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 3: Run driver matching
    const matchingResult =
        await driverMatchingService.batchProcessRecentConversations(7);
    logger.info({ matchingResult }, 'Manual driver matching completed');

    return {
        sheetSync: sheetResult,
        driverMatching: matchingResult,
    };
}

/**
 * Cron schedule patterns:
 *
 * - '* /10 * * * *'           = Every 10 minutes
 * - '5,15,25,35,45,55 * * * *' = Every 10 minutes, offset by 5
 * - '0 * * * *'               = Every hour
 * - '0 0 * * *'               = Every day at midnight
 * - '* /30 * * * *'            = Every 30 minutes
 */
