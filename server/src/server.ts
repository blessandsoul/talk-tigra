/**
 * Server Entry Point
 * 
 * Responsible for initializing the application, starting the HTTP server,
 * and handling graceful shutdowns of all core dependencies.
 * 
 * @see /mnt/project/02-general-rules.md
 */

import 'dotenv/config';
import buildApp from './app.js';
import { env } from './config/env.js';
import logger from './libs/logger.js';
import { prisma } from './libs/db.js';
import { redis } from './libs/redis.js';
import { fileQueue } from './libs/queue.js';

/**
 * Start the Fastify server
 */
// Track shutdown state to prevent race conditions
let isShuttingDown = false;

async function startServer() {
    try {
        const app = await buildApp();

        // Verify Database Connection
        try {
            await prisma.$connect();
            logger.info('Database connected successfully');
        } catch (dbError) {
            logger.error({
                error: dbError instanceof Error ? dbError.message : 'Unknown DB error'
            }, 'Failed to connect to database');
            logger.warn('Database connection closed. Running without database.');
        }

        // Start listening on configured port
        await app.listen({
            port: env.PORT,
            host: '0.0.0.0', // Listen on all interfaces (required for Docker)
        });

        const serverUrl = `http://localhost:${env.PORT}`;

        logger.info(`Server started in ${env.NODE_ENV} mode`);
        logger.info(`API is listening at: ${serverUrl}${env.API_PREFIX}`);
        logger.info(`Health check available at: ${serverUrl}/health`);

        /**
         * Graceful Shutdown Handler
         * 
         * Ensures all connections are closed properly before exiting.
         */
        const gracefulShutdown = async (signal: string) => {
            if (isShuttingDown) return;
            isShuttingDown = true;

            // Use console.log for shutdown messages to ensure they are printed
            // even if the async logger is terminated early.
            console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

            try {
                await app.close();
                console.log('HTTP server closed');
            } catch (err) {
                console.error('Error closing HTTP server:', err);
            }

            try {
                await prisma.$disconnect();
                console.log('Database connection closed');
            } catch (err) {
                console.error('Error closing database connection:', err);
            }

            // Close Redis-dependent services first, then Redis itself
            // fileQueue uses the shared redis connection, so close it before redis
            try {
                await fileQueue.close();
                console.log('File queue connection closed');
            } catch (err) {
                // Ignore - queue may already be disconnected if Redis failed
            }

            // Close Redis connection - use disconnect() for immediate close
            // quit() can hang or reject if connection is already closed by BullMQ
            try {
                // Check if Redis is still connected before attempting to close
                if (redis.status === 'ready' || redis.status === 'connect') {
                    await redis.quit();
                    console.log('Redis connection closed');
                } else {
                    redis.disconnect();
                    console.log('Redis connection closed (was not connected)');
                }
            } catch (err) {
                // Force disconnect if quit fails
                try { redis.disconnect(); } catch (e) { /* ignore */ }
                console.log('Redis connection closed (forced)');
            }

            console.log('Graceful shutdown complete. Goodbye');

            // Give a small grace period for any pending logs/events to flush
            setTimeout(() => {
                process.exit(0);
            }, 500);
        };

        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.fatal({
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, 'Failed to start server');
        process.exit(1);
    }
}

// Global Rejection Handler for Uncaught Promises
process.on('unhandledRejection', (reason, promise) => {
    // During shutdown, BullMQ/ioredis may emit unhandled rejections
    // as they try to perform operations on closed connections.
    // These are expected and safe to ignore during graceful shutdown.
    if (isShuttingDown) {
        return;
    }

    logger.fatal({ promise, reason }, 'Unhandled Rejection at Promise');
    process.exit(1);
});

// Run the server
startServer();
