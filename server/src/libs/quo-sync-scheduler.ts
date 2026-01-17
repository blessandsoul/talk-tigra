/**
 * Quo Sync Scheduler
 * 
 * Cron job to periodically sync conversations from Quo API
 */

import cron from 'node-cron';
import { quoSyncService } from '../modules/quo-messages/quo-sync.service.js';
import logger from './logger.js';
import { env } from '../config/env.js';

/**
 * Start the Quo sync cron job
 * 
 * Runs every 10 minutes to sync conversations and messages
 */
export function startQuoSyncScheduler(): void {
    // Get phone number ID from environment
    const phoneNumberId = env.QUO_PHONE_NUMBER_ID || 'PNqErUjbAJ';

    logger.info(
        { phoneNumberId, interval: '10 minutes' },
        '[QUO SCHEDULER] Starting Quo sync scheduler...'
    );

    // Run immediately on startup
    logger.info('[QUO SCHEDULER] Running initial sync on startup...');
    quoSyncService.syncAllConversations(phoneNumberId).catch((error) => {
        logger.error({ error: error.message }, '[QUO SCHEDULER] ERROR: Initial sync failed');
    });

    // Schedule to run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        logger.info('[QUO SCHEDULER] Running scheduled Quo sync...');

        try {
            await quoSyncService.syncAllConversations(phoneNumberId);
            logger.info('[QUO SCHEDULER] SUCCESS: Scheduled sync completed successfully');
        } catch (error: any) {
            logger.error({ error: error.message }, '[QUO SCHEDULER] ERROR: Scheduled sync failed');
        }
    });

    logger.info('[QUO SCHEDULER] Quo sync scheduler started successfully');
}

/**
 * Cron schedule patterns:
 * 
 * - '* /10 * * * *' = Every 10 minutes
 * - '0 * * * *'    = Every hour
 * - '0 0 * * *'    = Every day at midnight
 * - '* /30 * * * *' = Every 30 minutes
 * - '0 * /2 * * *'  = Every 2 hours
 */
