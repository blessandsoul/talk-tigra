import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { redis } from '../libs/redis.js';
import { env } from '../config/env.js';

export async function registerRateLimit(app: FastifyInstance) {
    await app.register(rateLimit, {
        global: true,
        max: env.RATE_LIMIT_MAX,
        timeWindow: env.RATE_LIMIT_WINDOW,
        redis,
        nameSpace: 'rate-limit:',
        errorResponseBuilder: (request, context) => ({
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many requests. Please try again in ${Math.ceil(context.ttl / 1000)}s.`,
            },
        }),
    });
}
