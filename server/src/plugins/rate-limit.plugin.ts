import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { redis, isRedisAvailable } from '../libs/redis.js';
import { env } from '../config/env.js';
import logger from '../libs/logger.js';

export async function registerRateLimit(app: FastifyInstance) {
    // Wait a moment to check Redis connection status
    await new Promise(resolve => setTimeout(resolve, 100));

    const useRedis = isRedisAvailable();

    if (!useRedis) {
        logger.warn('⚠️  Rate limiting using in-memory store (not suitable for production clusters)');
    }

    await app.register(rateLimit, {
        global: true,
        max: env.RATE_LIMIT_MAX,
        timeWindow: env.RATE_LIMIT_WINDOW,
        // Only use Redis if connected, otherwise fall back to in-memory
        redis: useRedis ? redis : undefined,
        nameSpace: 'rate-limit:',
        errorResponseBuilder: (_request, context) => ({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many requests. Please try again in ${Math.ceil(context.ttl / 1000)}s.`,
            },
        }),
    });
}
