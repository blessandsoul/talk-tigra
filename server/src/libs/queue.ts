/**
 * Background Job Queues
 * 
 * BullMQ queue configuration for asynchronous task processing.
 * 
 * @see /mnt/project/10-background-jobs-v2.md
 */

import { Queue } from 'bullmq';
import { redis } from './redis.js';
import logger from './logger.js';

/**
 * File Processing Queue
 * 
 * Handles file processing jobs (thumbnails, compression, format conversion, etc.)
 * 
 * Job Types:
 * - generate-thumbnail
 * - compress-image
 * - convert-format
 * - process-upload
 */
export const fileQueue = new Queue('files', {
    connection: redis as any,

    defaultJobOptions: {
        // Retry configuration
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds, then 4s, 8s
        },

        // Job cleanup
        removeOnComplete: {
            age: 3600, // Remove completed jobs after 1 hour
            count: 100, // Keep max 100 completed jobs
        },
        removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
        },


    },
});

/**
 * Queue Event Handlers
 */
fileQueue.on('error', (error: Error) => {
    // Suppress ECONNREFUSED logs during reconnection attempts to reduce noise
    if (error.message.includes('ECONNREFUSED') || error.stack?.includes('ECONNREFUSED')) {
        return;
    }

    logger.error(
        {
            queue: 'files',
            error: error.message,
            stack: error.stack,
        },
        'File queue error'
    );
});

fileQueue.on('waiting', (job) => {
    logger.debug(
        {
            queue: 'files',
            jobId: job.id,
        },
        'Job waiting in queue'
    );
});

logger.info('File queue initialized');


