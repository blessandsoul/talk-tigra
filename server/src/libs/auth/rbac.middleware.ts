/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Provides middleware functions to enforce role-based permissions on routes.
 * Must be used AFTER the authenticate middleware.
 * 
 * @see /mnt/project/02-general-rules.md
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../../utils/errors.js';

/**
 * User Role Type
 * 
 * Must match the roles defined in Prisma schema and JWT payload
 */
export type UserRole = 'USER' | 'ADMIN';

/**
 * RBAC Middleware Factory
 * 
 * Creates a preHandler middleware that checks if the authenticated user
 * has one of the required roles.
 * 
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Fastify preHandler function
 * 
 * @example
 * // Single role
 * app.get('/admin/users', {
 *   preHandler: [app.authenticate, requireRole('ADMIN')],
 *   handler: adminController.listUsers
 * });
 * 
 * @example
 * // Multiple roles
 * app.post('/resources', {
 *   preHandler: [app.authenticate, requireRole('USER', 'ADMIN')],
 *   handler: resourceController.create
 * });
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
        // Ensure user is authenticated (should be set by app.authenticate)
        if (!request.user) {
            throw new UnauthorizedError('Authentication required');
        }

        const userRole = request.user.role as UserRole;

        // Validate that user's role is in the allowed roles list
        if (!allowedRoles.includes(userRole)) {
            throw new ForbiddenError(
                `Access denied. Required role: ${allowedRoles.join(' or ')}`
            );
        }

        // User has required role, allow request to proceed
    };
}

/**
 * Require ADMIN role
 * 
 * Shorthand helper for routes that require admin access only.
 * 
 * @example
 * app.delete('/users/:id', {
 *   preHandler: [app.authenticate, requireAdmin()],
 *   handler: userController.deleteUser
 * });
 */
export const requireAdmin = () => requireRole('ADMIN');

/**
 * Require USER role
 * 
 * Shorthand helper for routes that require standard user access.
 * Note: This excludes ADMIN users. Use requireAny() to allow both.
 * 
 * @example
 * app.get('/profile', {
 *   preHandler: [app.authenticate, requireUser()],
 *   handler: userController.getProfile
 * });
 */
export const requireUser = () => requireRole('USER');

/**
 * Require any authenticated user (USER or ADMIN)
 * 
 * Shorthand helper for routes that require authentication but accept any role.
 * This is equivalent to just using app.authenticate without role checking.
 * 
 * @example
 * app.get('/resources', {
 *   preHandler: [app.authenticate, requireAny()],
 *   handler: resourceController.list
 * });
 */
export const requireAny = () => requireRole('USER', 'ADMIN');

/**
 * Check if user has specific role (utility function)
 * 
 * Can be used within route handlers for conditional logic.
 * 
 * @param request - Fastify request object
 * @param role - Role to check
 * @returns true if user has the role, false otherwise
 * 
 * @example
 * export async function getResources(request: FastifyRequest) {
 *   const resources = await resourceRepo.findAll();
 *   
 *   // Filter sensitive data for non-admin users
 *   if (!hasRole(request, 'ADMIN')) {
 *     return resources.map(r => omit(r, 'internalNotes'));
 *   }
 *   
 *   return resources;
 * }
 */
export function hasRole(request: FastifyRequest, role: UserRole): boolean {
    return request.user?.role === role;
}

/**
 * Check if user is admin (utility function)
 * 
 * @param request - Fastify request object
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(request: FastifyRequest): boolean {
    return hasRole(request, 'ADMIN');
}

/**
 * Check if user is regular user (utility function)
 * 
 * @param request - Fastify request object
 * @returns true if user is regular user, false otherwise
 */
export function isUser(request: FastifyRequest): boolean {
    return hasRole(request, 'USER');
}
