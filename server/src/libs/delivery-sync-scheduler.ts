/**
 * Delivery Sync Scheduler
 *
 * Coordinates delivery sync jobs:
 * 1. Regular sync every 10 minutes - upserts today's deliveries from sheet
 * 2. Daily reset at 2PM - deletes all records and re-syncs fresh data
 */

import cron from 'node-cron';
import { deliverySyncService } from '../modules/deliveries/delivery-sync.service.js';
import { deliveryRepo } from '../modules/deliveries/deliveries.repo.js';
import logger from './logger.js';
import { env } from '../config/env.js';

/**
 * Start the Delivery Sync Scheduler
 */
export function startDeliverySyncScheduler(): void {
    const sheetId = env.GOOGLE_SHEET_ID;

    if (!sheetId) {
        logger.warn(
            '[DELIVERY SYNC] GOOGLE_SHEET_ID not configured, delivery sync scheduler will not start'
        );
        return;
    }

    logger.info('[DELIVERY SYNC] Starting delivery sync scheduler...');

    // ============================================================
    // Run sync immediately on startup
    // ============================================================
    deliverySyncService.syncDeliveriesToday().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ error: message }, '[DELIVERY SYNC] ERROR: Initial sync failed');
    });

    // ============================================================
    // Job 1: Regular sync every 10 minutes
    // ============================================================
    cron.schedule('*/10 * * * *', async () => {
        try {
            const result = await deliverySyncService.syncDeliveriesToday();
            logger.info(result, '[DELIVERY SYNC] SUCCESS: Scheduled sync completed');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error({ error: message }, '[DELIVERY SYNC] ERROR: Scheduled sync failed');
        }
    });

    // ============================================================
    // Job 2: Daily reset at 2PM - delete all + re-sync
    // ============================================================
    cron.schedule('0 14 * * *', async () => {
        try {
            logger.info('[DELIVERY SYNC] Starting daily 2PM reset...');

            const deleteResult = await deliveryRepo.deleteAll();
            logger.info(
                { deleted: deleteResult.count },
                '[DELIVERY SYNC] Deleted all deliveries for daily reset'
            );

            const syncResult = await deliverySyncService.syncDeliveriesToday();
            logger.info(syncResult, '[DELIVERY SYNC] SUCCESS: 2PM reset+sync completed');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error({ error: message }, '[DELIVERY SYNC] ERROR: 2PM reset failed');
        }
    });

    logger.info('[DELIVERY SYNC] Delivery sync scheduler started (10-min sync + 2PM daily reset)');
}
