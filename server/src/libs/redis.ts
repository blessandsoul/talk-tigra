/**
 * Redis Connection
 * 
 * Redis client for caching, sessions, and BullMQ queues.
 * 
 * @see /mnt/project/10-background-jobs-v2.md
 */

import Redis from 'ioredis';
import logger from './logger.js';

/**
 * Create Redis client instance
 * 
 * Configuration:
 * - maxRetriesPerRequest: null (REQUIRED for BullMQ)
 * - Automatic reconnection
 * - Error handling
 */
const redis = new Redis({
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    password: process.env['REDIS_PASSWORD'] || undefined,
    db: parseInt(process.env['REDIS_DB'] || '0'),

    // CRITICAL: Required for BullMQ compatibility
    maxRetriesPerRequest: null,

    // Retry strategy
    retryStrategy: () => {
        // Stop retrying immediately if connection fails
        logger.error('Redis connection failed. Running without Redis.');
        return null;
    },

    // Connection timeout
    connectTimeout: 10000,

    // Enable offline queue
    enableOfflineQueue: true,
});

/**
 * Connection Event Handlers
 */
redis.on('connect', () => {
    logger.info('Redis connected');
});

redis.on('ready', () => {
    logger.info('Redis ready to accept commands');
});

redis.on('error', (error: Error) => {
    // Suppress ECONNREFUSED logs (connection refused) to prevent noise when Redis is offline
    if (error.message.includes('ECONNREFUSED') || error.stack?.includes('ECONNREFUSED')) {
        return;
    }

    logger.error(
        {
            error: error.message,
            stack: error.stack,
        },
        'Redis connection error'
    );
});

redis.on('close', () => {
    logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
});



export { redis };
