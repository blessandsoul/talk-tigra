import { FastifyInstance } from 'fastify';
import * as adminController from './admin.controller.js';

/**
 * Admin Routes
 * All routes require ADMIN role
 */
export async function adminRoutes(app: FastifyInstance) {
    /**
     * GET /admin/users
     * List all users with pagination
     */
    app.get('/users', {
        preHandler: [app.authenticate, app.requireAdmin()],
        handler: adminController.listAllUsers,
    });

    /**
     * GET /admin/users/:id
     * Get user details
     */
    app.get('/users/:id', {
        preHandler: [app.authenticate, app.requireAdmin()],
        handler: adminController.getUserById,
    });

    /**
     * DELETE /admin/users/:id
     * Delete user
     */
    app.delete('/users/:id', {
        preHandler: [app.authenticate, app.requireAdmin()],
        handler: adminController.deleteUser,
    });

    /**
     * POST /admin/users/:id/change-role
     * Change user role
     */
    app.post('/users/:id/change-role', {
        preHandler: [app.authenticate, app.requireAdmin()],
        handler: adminController.changeUserRole,
    });

    /**
     * POST /admin/users/:id/verify-email
     * Manually verify user email
     */
    app.post('/users/:id/verify-email', {
        preHandler: [app.authenticate, app.requireAdmin()],
        handler: adminController.verifyUserEmail,
    });

    /**
     * GET /admin/stats
     * Get system statistics
     */
    app.get('/stats', {
        preHandler: [app.authenticate, app.requireAdmin()],
        handler: adminController.getSystemStats,
    });
}
