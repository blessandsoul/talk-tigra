/**
 * File Processing Background Worker
 * 
 * Process jobs from the 'files' queue.
 * Reference implementation for background job processing.
 * 
 * @see /mnt/project/10-background-jobs-v2.md
 */

import { Worker, Job } from 'bullmq';
import { redis } from '../libs/redis.js';
import logger from '../libs/logger.js';


/**
 * Data structure for file processing jobs
 */
export interface FileJobData {
    fileId: string;
    path: string;
    operation: 'thumbnail' | 'compress' | 'convert';
    options?: Record<string, any>;
}

/**
 * Mock file processor
 * In a real app, this would use sharp, ffmpeg, etc.
 */
async function processFile(data: FileJobData): Promise<void> {
    const { fileId, operation } = data;

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info({ fileId, operation }, 'File successfully processed');
}

/**
 * File Worker Implementation
 * 
 * Processes files in the background with:
 * - Rate limit of 100 jobs per minute
 * - Concurrency of 5 jobs at a time
 */
export const fileWorker = new Worker<FileJobData>(
    'files',
    async (job: Job<FileJobData>) => {
        const { fileId, operation } = job.data;

        logger.info({ jobId: job.id, fileId, operation }, 'Processing file job');

        try {
            await processFile(job.data);
            return { success: true, processedAt: new Date().toISOString() };
        } catch (error) {
            logger.error(
                {
                    jobId: job.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                'Failed to process file'
            );
            throw error;
        }
    },
    {
        connection: redis as any,
        concurrency: 5,
        limiter: {
            max: 100,
            duration: 60000,
        },
    }
);

/**
 * Worker Event Listeners
 */
fileWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: 'files' }, 'File job completed');
});

fileWorker.on('failed', (job, error) => {
    logger.error(
        {
            jobId: job?.id,
            queue: 'files',
            error: error.message,
        },
        'File job failed'
    );
});

/**
 * Graceful Shutdown
 */
const shutdownWorker = async (signal: string) => {
    logger.info(`Received ${signal}, closing file worker...`);
    await fileWorker.close();
    process.exit(0);
};

process.on('SIGTERM', () => shutdownWorker('SIGTERM'));
process.on('SIGINT', () => shutdownWorker('SIGINT'));

logger.info('File worker initialized and listening for jobs');
