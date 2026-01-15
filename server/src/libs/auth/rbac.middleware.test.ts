/**
 * RBAC Middleware Tests
 * 
 * Tests for role-based access control middleware functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { requireRole, requireAdmin, requireUser, hasRole, isAdmin } from './rbac.middleware';
import { ForbiddenError, UnauthorizedError } from '../../utils/errors';

describe('RBAC Middleware', () => {
    let mockRequest: any;
    let mockReply: any;

    beforeEach(() => {
        mockRequest = {
            user: undefined,
        };
        mockReply = {};
    });

    describe('requireRole', () => {
        it('should allow access when user has required role', async () => {
            mockRequest.user = { userId: '123', email: 'admin@test.com', role: 'ADMIN' };
            const middleware = requireRole('ADMIN');

            await expect(
                middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).resolves.not.toThrow();
        });

        it('should allow access when user has one of multiple allowed roles', async () => {
            mockRequest.user = { userId: '123', email: 'user@test.com', role: 'USER' };
            const middleware = requireRole('USER', 'ADMIN');

            await expect(
                middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).resolves.not.toThrow();
        });

        it('should throw UnauthorizedError when user is not authenticated', async () => {
            mockRequest.user = undefined;
            const middleware = requireRole('ADMIN');

            await expect(
                middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).rejects.toThrow(UnauthorizedError);
        });

        it('should throw ForbiddenError when user lacks required role', async () => {
            mockRequest.user = { userId: '123', email: 'user@test.com', role: 'USER' };
            const middleware = requireRole('ADMIN');

            await expect(
                middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('requireAdmin', () => {
        it('should allow access for ADMIN users', async () => {
            mockRequest.user = { userId: '123', email: 'admin@test.com', role: 'ADMIN' };
            const middleware = requireAdmin();

            await expect(
                middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).resolves.not.toThrow();
        });

        it('should deny access for USER role', async () => {
            mockRequest.user = { userId: '123', email: 'user@test.com', role: 'USER' };
            const middleware = requireAdmin();

            await expect(
                middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('requireUser', () => {
        it('should allow access for USER role', async () => {
            mockRequest.user = { userId: '123', email: 'user@test.com', role: 'USER' };
            const middleware = requireUser();

            await expect(
                middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).resolves.not.toThrow();
        });

        it('should deny access for ADMIN role', async () => {
            mockRequest.user = { userId: '123', email: 'admin@test.com', role: 'ADMIN' };
            const middleware = requireUser();

            await expect(
                middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('hasRole utility', () => {
        it('should return true when user has the role', () => {
            mockRequest.user = { userId: '123', email: 'admin@test.com', role: 'ADMIN' };

            expect(hasRole(mockRequest as FastifyRequest, 'ADMIN')).toBe(true);
        });

        it('should return false when user does not have the role', () => {
            mockRequest.user = { userId: '123', email: 'user@test.com', role: 'USER' };

            expect(hasRole(mockRequest as FastifyRequest, 'ADMIN')).toBe(false);
        });

        it('should return false when user is not authenticated', () => {
            mockRequest.user = undefined;

            expect(hasRole(mockRequest as FastifyRequest, 'ADMIN')).toBe(false);
        });
    });

    describe('isAdmin utility', () => {
        it('should return true for ADMIN users', () => {
            mockRequest.user = { userId: '123', email: 'admin@test.com', role: 'ADMIN' };

            expect(isAdmin(mockRequest as FastifyRequest)).toBe(true);
        });

        it('should return false for non-ADMIN users', () => {
            mockRequest.user = { userId: '123', email: 'user@test.com', role: 'USER' };

            expect(isAdmin(mockRequest as FastifyRequest)).toBe(false);
        });
    });
});
