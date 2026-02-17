/**
 * Pickup Sync Scheduler
 *
 * Coordinates pickup sync jobs:
 * 1. Regular sync every 10 minutes - upserts today's pickups from sheet
 * 2. Daily reset at 2PM - deletes all records and re-syncs fresh data
 */

import cron from 'node-cron';
import { pickupSyncService } from '../modules/pickups/pickup-sync.service.js';
import { pickupRepo } from '../modules/pickups/pickups.repo.js';
import logger from './logger.js';
import { env } from '../config/env.js';

/**
 * Start the Pickup Sync Scheduler
 */
export function startPickupSyncScheduler(): void {
    const sheetId = env.GOOGLE_SHEET_ID;

    if (!sheetId) {
        logger.warn(
            '[PICKUP SYNC] GOOGLE_SHEET_ID not configured, pickup sync scheduler will not start'
        );
        return;
    }

    logger.info('[PICKUP SYNC] Starting pickup sync scheduler...');

    // ============================================================
    // Run sync immediately on startup
    // ============================================================
    pickupSyncService.syncPickupsToday().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ error: message }, '[PICKUP SYNC] ERROR: Initial sync failed');
    });

    // ============================================================
    // Job 1: Regular sync every 10 minutes
    // ============================================================
    cron.schedule('*/10 * * * *', async () => {
        try {
            const result = await pickupSyncService.syncPickupsToday();
            logger.info(result, '[PICKUP SYNC] SUCCESS: Scheduled sync completed');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error({ error: message }, '[PICKUP SYNC] ERROR: Scheduled sync failed');
        }
    });

    // ============================================================
    // Job 2: Daily reset at 2PM - delete all + re-sync
    // ============================================================
    cron.schedule('0 14 * * *', async () => {
        try {
            logger.info('[PICKUP SYNC] Starting daily 2PM reset...');

            const deleteResult = await pickupRepo.deleteAll();
            logger.info(
                { deleted: deleteResult.count },
                '[PICKUP SYNC] Deleted all pickups for daily reset'
            );

            const syncResult = await pickupSyncService.syncPickupsToday();
            logger.info(syncResult, '[PICKUP SYNC] SUCCESS: 2PM reset+sync completed');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error({ error: message }, '[PICKUP SYNC] ERROR: 2PM reset failed');
        }
    });

    logger.info('[PICKUP SYNC] Pickup sync scheduler started (10-min sync + 2PM daily reset)');
}
