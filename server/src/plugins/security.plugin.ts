import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import { env } from '../config/env.js';

export async function registerSecurityPlugins(app: FastifyInstance) {
    // CORS - Cross-Origin Resource Sharing
    await app.register(cors, {
        origin: env.NODE_ENV === 'development' ? true : env.CORS_ALLOWED_ORIGINS.split(','),
        credentials: true,
    });

    // Helmet - Security headers
    await app.register(helmet, {
        contentSecurityPolicy: env.NODE_ENV === 'production',
    });

    // Compression - Gzip/Deflate
    await app.register(compress, { global: true });
}
