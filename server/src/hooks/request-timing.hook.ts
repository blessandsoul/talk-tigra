import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export function registerRequestHooks(app: FastifyInstance) {
    app.addHook('onRequest', async (request) => {
        request.startTime = Date.now();
    });

    app.addHook('onResponse', async (request, reply) => {
        const duration = Date.now() - request.startTime;
        const logData = {
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            duration: `${duration}ms`,
            ip: request.ip,
            requestId: request.id,
        };

        if (duration > env.SLOW_QUERY_THRESHOLD) {
            app.log.warn(logData, 'Slow response detected');
        } else {
            app.log.info(logData, 'Request completed');
        }
    });
}
