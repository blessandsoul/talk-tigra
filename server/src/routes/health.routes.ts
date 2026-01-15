import { FastifyInstance } from 'fastify';
import { prisma } from '../libs/db.js';
import { redis } from '../libs/redis.js';

export async function healthRoutes(app: FastifyInstance) {
    app.get('/health', async (request, reply) => {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
            redis: 'connected',
        };

        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            health.database = 'disconnected';
            health.status = 'unhealthy';
        }

        try {
            await redis.ping();
        } catch (error) {
            health.redis = 'disconnected';
            health.status = 'unhealthy';
        }

        return reply.status(health.status === 'healthy' ? 200 : 503).send(health);
    });
}
