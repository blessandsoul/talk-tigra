/**
 * Database Connection
 * 
 * Prisma Client instance with query logging and error handling.
 * 
 * @see /mnt/project/01-db-and-migrations.md
 * @see /mnt/project/08-observability.md
 */

import { PrismaClient, Prisma } from '@prisma/client';
import logger from './logger.js';

/**
 * Create Prisma Client instance
 * 
 * Features:
 * - Slow query logging (> 1000ms)
 * - Error logging
 * - Query logging in development (optional)
 */
const prisma = new PrismaClient({
    log:
        process.env['PRISMA_QUERY_LOG'] === 'true'
            ? [
                { level: 'query', emit: 'event' },
                { level: 'info', emit: 'stdout' },
                { level: 'warn', emit: 'stdout' },
                { level: 'error', emit: 'event' },
            ]
            : [
                { level: 'warn', emit: 'stdout' },
                { level: 'error', emit: 'event' },
                { level: 'query', emit: 'event' },
            ],
});

/**
 * Slow Query Logging
 * 
 * Logs a warning when a query takes longer than the threshold.
 * Helps identify performance bottlenecks.
 */
prisma.$on('query', (e: Prisma.QueryEvent) => {
    const threshold = parseInt(process.env['SLOW_QUERY_THRESHOLD'] || '1000');

    if (e.duration > threshold) {
        logger.warn(
            {
                query: e.query,
                params: e.params,
                duration: e.duration,
                target: e.target,
            },
            `Slow query detected (${e.duration}ms)`
        );
    }
});

/**
 * Error Logging
 * 
 * Logs database errors for monitoring and debugging.
 */
prisma.$on('error', (e: Prisma.LogEvent) => {
    logger.error(
        {
            message: e.message,
            target: e.target,
        },
        'Database error occurred'
    );
});



export { prisma };
