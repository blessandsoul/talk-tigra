/**
 * Redis Connection
 * 
 * Redis client for caching, sessions, and BullMQ queues.
 * Gracefully degrades when Redis is unavailable.
 * 
 * @see /mnt/project/10-background-jobs-v2.md
 */

import Redis from 'ioredis';
import logger from './logger.js';

/**
 * Track Redis connection state
 */
let isRedisConnected = false;
let hasLoggedOfflineWarning = false;
let hasGivenUp = false;

/**
 * Create Redis client instance with minimal retry strategy
 * 
 * Configuration:
 * - maxRetriesPerRequest: null (REQUIRED for BullMQ)
 * - Try once, then give up silently
 * - Graceful degradation when offline
 */
const redis = new Redis({
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    password: process.env['REDIS_PASSWORD'] || undefined,
    db: parseInt(process.env['REDIS_DB'] || '0'),

    // CRITICAL: Required for BullMQ compatibility
    maxRetriesPerRequest: null,

    // Minimal retry strategy: try once, then give up
    retryStrategy: (times: number) => {
        // First failure - log warning
        if (times === 1 && !hasLoggedOfflineWarning) {
            logger.warn('⚠️  Redis unavailable - server running in degraded mode (no caching, no rate limiting)');
            hasLoggedOfflineWarning = true;
            // Try one more time after 2 seconds
            return 2000;
        }

        // Second failure - give up completely
        if (times === 2) {
            hasGivenUp = true;
        }

        // Stop retrying
        return null;
    },

    // Connection timeout
    connectTimeout: 10000,

    // Disable offline queue to prevent memory buildup
    enableOfflineQueue: false,

    // Lazy connect - don't block server startup
    lazyConnect: true,
});

/**
 * Connection Event Handlers
 */
redis.on('connect', () => {
    logger.info('✓ Redis connected');
    isRedisConnected = true;
});

redis.on('ready', () => {
    logger.info('✓ Redis ready');
    isRedisConnected = true;
    hasLoggedOfflineWarning = false;
});

redis.on('error', (error: Error) => {
    isRedisConnected = false;

    // After giving up, suppress all Redis errors
    if (hasGivenUp) {
        return;
    }

    // Suppress noisy connection errors
    if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('Connection is closed')
    ) {
        return;
    }

    logger.error(
        {
            error: error.message,
            stack: error.stack,
        },
        'Redis error'
    );
});

redis.on('close', () => {
    isRedisConnected = false;

    // Don't log if we've already given up
    if (hasGivenUp) {
        return;
    }
    logger.warn('Redis connection closed - attempting reconnect...');
});

redis.on('reconnecting', () => {
    // Don't log reconnection attempts after giving up
    if (hasGivenUp) {
        return;
    }
    logger.info(`Redis reconnecting...`);
});

/**
 * Attempt initial connection (non-blocking)
 */
redis.connect().catch(() => {
    // Silently fail - retry strategy will handle reconnection
});

/**
 * Check if Redis is currently connected
 */
export const isRedisAvailable = (): boolean => isRedisConnected;

export { redis };
