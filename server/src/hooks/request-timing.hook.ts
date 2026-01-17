import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export function registerRequestHooks(app: FastifyInstance) {
    app.addHook('onRequest', async (request) => {
        request.startTime = Date.now();
    });

    app.addHook('onResponse', async (request, reply) => {
        const duration = Date.now() - request.startTime;

        // Skip logging for health checks and frequent polling endpoints
        if (request.url === '/health' || request.url.includes('favicon')) {
            return;
        }

        // Only log slow requests, errors, or debug mode
        const isSlowRequest = duration > env.SLOW_QUERY_THRESHOLD;
        const isError = reply.statusCode >= 400;

        if (isSlowRequest || isError) {
            const logData = {
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                duration: `${duration}ms`,
                ip: request.ip,
            };

            if (isError) {
                app.log.warn(logData, '[API] ERROR: Request failed');
            } else {
                app.log.warn(logData, '[API] SLOW: Request took too long');
            }
        }
        // Normal successful requests are NOT logged to reduce noise
    });
}
