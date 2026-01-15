/**
 * Authentication Repository
 * 
 * Database operations for authentication module.
 * Handles all Prisma queries related to users and sessions.
 * 
 * @see /mnt/project/02-general-rules.md
 */

import { prisma } from '../../libs/db.js';
import type { User as PrismaUser, Session as PrismaSession } from '@prisma/client';
import type { User } from './auth.types.js';

/**
 * User with password (internal use only)
 */
type UserWithPassword = PrismaUser;

/**
 * Session with user relation
 */
type SessionWithUser = PrismaSession & {
    user: PrismaUser;
};

/**
 * Create a new user
 * 
 * @param data - User creation data
 * @returns User object WITHOUT password field
 */
export async function createUser(data: {
    email: string;
    password: string;
    name: string;
}): Promise<User> {
    const user = await prisma.user.create({
        data: {
            email: data.email,
            password: data.password,
            name: data.name,
            role: 'USER',
            emailVerified: false,
        },
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

    return user;
}

/**
 * Find user by email (without password)
 * 
 * @param email - User email
 * @returns User object WITHOUT password field, or null if not found
 */
export async function findUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
        where: { email },
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

    return user;
}

/**
 * Find user by email WITH password
 * 
 * Used for login verification only.
 * NEVER return this to the client.
 * 
 * @param email - User email
 * @returns User object WITH password field, or null if not found
 */
export async function findUserByEmailWithPassword(
    email: string
): Promise<UserWithPassword | null> {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    return user;
}

/**
 * Find user by ID (without password)
 * 
 * @param id - User ID
 * @returns User object WITHOUT password field, or null if not found
 */
export async function findUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
        where: { id },
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

    return user;
}

/**
 * Create a new session
 * 
 * @param data - Session creation data
 * @returns Created session
 */
export async function createSession(data: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
}): Promise<PrismaSession> {
    const session = await prisma.session.create({
        data: {
            userId: data.userId,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
        },
    });

    return session;
}

/**
 * Find session by refresh token
 * 
 * @param refreshToken - Refresh token
 * @returns Session with user relation, or null if not found
 */
export async function findSessionByToken(
    refreshToken: string
): Promise<SessionWithUser | null> {
    const session = await prisma.session.findFirst({
        where: { refreshToken },
        include: {
            user: true,
        },
    });

    return session;
}

/**
 * Update session with new refresh token
 * 
 * @param oldToken - Current refresh token
 * @param newToken - New refresh token
 * @param expiresAt - New expiration date
 * @returns Updated session
 */
export async function updateSession(
    oldToken: string,
    newToken: string,
    expiresAt: Date
): Promise<PrismaSession> {
    // Since refreshToken is no longer unique at DB level, we use updateMany
    // In practice, it should only update one record
    await prisma.session.updateMany({
        where: { refreshToken: oldToken },
        data: {
            refreshToken: newToken,
            expiresAt,
        },
    });

    // Return the updated session (requires a fetch since updateMany returns a count)
    const session = await prisma.session.findFirstOrThrow({
        where: { refreshToken: newToken },
    });

    return session;
}

/**
 * Delete session by refresh token
 * 
 * @param refreshToken - Refresh token
 */
export async function deleteSession(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({
        where: { refreshToken },
    });
}

/**
 * Delete all sessions for a user
 * 
 * Used for logout from all devices.
 * 
 * @param userId - User ID
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
        where: { userId },
    });
}
