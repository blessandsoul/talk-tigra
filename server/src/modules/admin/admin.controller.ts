/**
 * Admin Controller
 * HTTP request handlers for admin operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import { BadRequestError } from '../../utils/errors.js';
import * as adminService from './admin.service.js';
import type { ListUsersInput, UserIdInput, ChangeRoleInput } from './admin.schemas.js';

/**
 * GET /admin/users
 * List all users with pagination
 */
export async function listAllUsers(
    request: FastifyRequest<{ Querystring: ListUsersInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    const { page, limit } = request.query;

    const { users, totalCount } = await adminService.listAllUsers(page, limit);

    return reply.status(200).send(
        paginatedResponse('Users retrieved successfully', users, page, limit, totalCount)
    );
}

/**
 * GET /admin/users/:id
 * Get user by ID
 */
export async function getUserById(
    request: FastifyRequest<{ Params: UserIdInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    const { id } = request.params;

    const user = await adminService.getUserById(id);

    return reply.status(200).send(
        successResponse('User retrieved successfully', user)
    );
}

/**
 * DELETE /admin/users/:id
 * Delete user
 */
export async function deleteUser(
    request: FastifyRequest<{ Params: UserIdInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    const { id } = request.params;

    if (request.user?.userId === id) {
        throw new BadRequestError('Cannot delete your own account');
    }

    await adminService.deleteUser(id);

    return reply.status(200).send(
        successResponse('User deleted successfully', null)
    );
}

/**
 * POST /admin/users/:id/change-role
 * Change user role
 */
export async function changeUserRole(
    request: FastifyRequest<{
        Params: UserIdInput;
        Body: ChangeRoleInput;
    }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    const { id } = request.params;
    const { role } = request.body;

    if (request.user?.userId === id) {
        throw new BadRequestError('Cannot change your own role');
    }

    const updated = await adminService.changeUserRole(id, role);

    return reply.status(200).send(
        successResponse('User role updated successfully', updated)
    );
}

/**
 * POST /admin/users/:id/verify-email
 * Manually verify user email
 */
export async function verifyUserEmail(
    request: FastifyRequest<{ Params: UserIdInput }>,
    reply: FastifyReply
): Promise<FastifyReply> {
    const { id } = request.params;

    await adminService.verifyUserEmail(id);

    return reply.status(200).send(
        successResponse('User email verified successfully', null)
    );
}

/**
 * GET /admin/stats
 * Get system statistics
 */
export async function getSystemStats(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<FastifyReply> {
    const stats = await adminService.getSystemStats();

    return reply.status(200).send(
        successResponse('System statistics retrieved successfully', stats)
    );
}
