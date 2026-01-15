/**
 * Admin Service
 * Business logic for admin operations
 */

import { prisma } from '../../libs/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import logger from '../../libs/logger.js';
import type { UserRole } from '@prisma/client';

/**
 * List all users with pagination
 */
export async function listAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count(),
    ]);

    return { users, totalCount };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    return user;
}

/**
 * Delete user
 */
export async function deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    await prisma.user.delete({
        where: { id: userId },
    });

    logger.info({ userId }, 'User deleted by admin');
}

/**
 * Change user role
 */
export async function changeUserRole(userId: string, newRole: UserRole) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: {
            id: true,
            email: true,
            role: true,
        },
    });

    logger.info({ userId, oldRole: user.role, newRole }, 'User role changed by admin');

    return updated;
}

/**
 * Manually verify user email
 */
export async function verifyUserEmail(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    if (user.emailVerified) {
        throw new BadRequestError('Email already verified');
    }

    await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
    });

    logger.info({ userId }, 'User email verified by admin');
}

/**
 * Get system statistics
 */
export async function getSystemStats() {
    const [
        totalUsers,
        totalAdmins,
        totalResources,
        verifiedUsers,
        usersToday,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.resource.count(),
        prisma.user.count({ where: { emailVerified: true } }),
        prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
        }),
    ]);

    return {
        users: {
            total: totalUsers,
            admins: totalAdmins,
            verified: verifiedUsers,
            registeredToday: usersToday,
        },
        resources: {
            total: totalResources,
        },
    };
}
