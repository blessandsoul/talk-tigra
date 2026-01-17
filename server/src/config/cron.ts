/**
 * Cron Jobs Setup
 *
 * Scheduled tasks that run periodically:
 * - Match unknown drivers to locations every 10 minutes
 */

import cron from 'node-cron';
import logger from '../libs/logger.js';
import { unknownDriverService } from '../modules/drivers/unknown-driver.service.js';

export function initCronJobs() {
    logger.info('[CRON] Initializing scheduled jobs...');

    /**
     * Match Unknown Drivers to Locations
     * Runs every 10 minutes
     *
     * This job checks the unknown_drivers table and tries to match
     * phone numbers + load IDs against the loads table. When a match
     * is found, it creates driver_location records.
     */

    // Run immediately on startup
    (async () => {
        try {
            logger.info('[CRON] Running unknown driver matching on startup...');
            const result = await unknownDriverService.matchUnknownDrivers();
            logger.info(
                { matchedCount: result.matchedCount, totalChecked: result.totalChecked },
                '[CRON] SUCCESS: Startup unknown driver matching completed'
            );
        } catch (error: any) {
            logger.error({ error: error.message }, '[CRON] ERROR: Startup unknown driver matching failed');
        }
    })();

    // Then schedule to run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        try {
            logger.info('[CRON] Running scheduled unknown driver matching...');
            const result = await unknownDriverService.matchUnknownDrivers();
            logger.info(
                { matchedCount: result.matchedCount, totalChecked: result.totalChecked },
                '[CRON] SUCCESS: Scheduled unknown driver matching completed'
            );
        } catch (error: any) {
            logger.error({ error: error.message }, '[CRON] ERROR: Unknown driver matching cron job failed');
        }
    });

    logger.info('[CRON] All scheduled jobs initialized successfully');
}
