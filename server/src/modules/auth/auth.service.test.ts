import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from './auth.service';
import * as authRepo from './auth.repo';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../utils/errors.js';

// Mock dependencies
vi.mock('./auth.repo');
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');
vi.mock('@/libs/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe('Auth Service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Setup default env mocks if needed
        env.JWT_SECRET = 'test-secret';
        env.JWT_ACCESS_EXPIRATION = '15m';
        env.JWT_REFRESH_EXPIRATION = '7d';
        env.JWT_ISSUER = 'test-issuer';
    });

    describe('register', () => {
        const registerData = {
            email: 'test@example.com',
            password: 'Password123!',
            name: 'Test User',
        };

        it('should successfully register a new user', async () => {
            // Mocks
            vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);
            vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password' as any);
            vi.mocked(authRepo.createUser).mockResolvedValue({
                id: 'user-123',
                email: registerData.email,
                name: registerData.name,
                role: 'USER',
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            vi.mocked(jwt.sign).mockReturnValue('mock_token' as any);
            vi.mocked(authRepo.createSession).mockResolvedValue({} as any);

            // Execute
            const result = await authService.register(registerData);

            // Assert
            expect(result).toBeDefined();
            expect(result.user.email).toBe(registerData.email);
            expect(result.tokens.accessToken).toBe('mock_token');
            expect(authRepo.createUser).toHaveBeenCalled();
            expect(authRepo.createSession).toHaveBeenCalled();
        });

        it('should throw ConflictError if email already exists', async () => {
            // Mocks
            vi.mocked(authRepo.findUserByEmail).mockResolvedValue({ id: 'existing' } as any);

            // Execute & Assert
            await expect(authService.register(registerData))
                .rejects
                .toThrow(ConflictError);
        });
    });

    describe('login', () => {
        const loginData = {
            email: 'test@example.com',
            password: 'Password123!',
        };

        it('should successfully login user', async () => {
            // Mocks
            vi.mocked(authRepo.findUserByEmailWithPassword).mockResolvedValue({
                id: 'user-123',
                email: loginData.email,
                password: 'hashed_password', // Match what bcrypt.compare expects
                role: 'USER',
            } as any);
            vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
            vi.mocked(authRepo.findUserById).mockResolvedValue({
                id: 'user-123',
                email: loginData.email,
                role: 'USER',
            } as any);
            vi.mocked(jwt.sign).mockReturnValue('mock_token' as any);
            vi.mocked(authRepo.createSession).mockResolvedValue({} as any);

            const result = await authService.login(loginData);

            expect(result).toBeDefined();
            expect(result.user.id).toBe('user-123');
            expect(result.tokens.accessToken).toBeDefined();
        });

        it('should throw UnauthorizedError on invalid password', async () => {
            // Mocks
            vi.mocked(authRepo.findUserByEmailWithPassword).mockResolvedValue({
                id: 'user-123',
                password: 'hashed_password',
            } as any);
            vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

            await expect(authService.login(loginData))
                .rejects
                .toThrow(UnauthorizedError);
        });
    });
});
