/**
 * Fastify Application Configuration
 *
 * Main entry point for configuring the Fastify instance, plugins,
 * middleware, hooks, and global error handling.
 *
 * @see /mnt/project/02-general-rules.md
 * @see /mnt/project/06-response-handling.md
 * @see /mnt/project/08-observability.md
 * @see /mnt/project/11-rate-limiting-v2.md
 */

import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import logger from './libs/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extracted Modules
import { setupErrorHandler } from './libs/error-handler.js';
import { registerSecurityPlugins } from './plugins/security.plugin.js';
import { registerRateLimit } from './plugins/rate-limit.plugin.js';
import { registerRequestHooks } from './hooks/request-timing.hook.js';
import { authenticateMiddleware } from './libs/auth/authenticate.middleware.js';
import { healthRoutes } from './routes/health.routes.js';

// Routes & RBAC
import { authRoutes } from './modules/auth/auth.routes.js';
import { resourceRoutes } from './modules/resources/resources.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { quoMessagesRoutes } from './modules/quo-messages/quo-messages.routes.js';
import { driverRoutes } from './modules/drivers/driver.routes.js';
import { unknownDriverRoutes } from './modules/drivers/unknown-driver.routes.js';
import n8nRoutes from './modules/n8n/n8n.routes.js';
import {
    requireRole,
    requireAdmin,
    requireUser,
    requireAny,
} from './libs/auth/rbac.middleware.js';

/**
 * Configure and build the Fastify application
 */
const buildApp = async () => {
    const app = fastify({
        loggerInstance: logger,
        disableRequestLogging: true, // Custom logging handled by hooks
    });

    // 1. Plugins
    await registerSecurityPlugins(app);
    await registerRateLimit(app);

    // 2. Decorators
    app.decorate('authenticate', authenticateMiddleware);
    app.decorate('requireRole', requireRole);
    app.decorate('requireAdmin', requireAdmin);
    app.decorate('requireUser', requireUser);
    app.decorate('requireAny', requireAny);

    // 3. Hooks
    registerRequestHooks(app);

    // 4. Error Handler
    app.setErrorHandler(setupErrorHandler);

    // 5. Routes
    await app.register(healthRoutes);
    await app.register(authRoutes, { prefix: `${env.API_PREFIX}/auth` });
    await app.register(resourceRoutes, { prefix: `${env.API_PREFIX}/resources` });
    await app.register(adminRoutes, { prefix: `${env.API_PREFIX}/admin` });
    await app.register(quoMessagesRoutes, { prefix: env.API_PREFIX });
    await app.register(driverRoutes, { prefix: env.API_PREFIX });
    await app.register(unknownDriverRoutes, { prefix: `${env.API_PREFIX}/unknown-drivers` });
    await app.register(n8nRoutes, { prefix: `${env.API_PREFIX}/n8n` });

    // 6. Serve static files from public directory (after routes to avoid conflicts)
    await app.register(fastifyStatic, {
        root: path.join(__dirname, '..', 'public'),
        prefix: '/', // Serve at root path
    });

    return app;
};

export default buildApp;
