/**
 * Authentication Service
 * 
 * Business logic for authentication operations.
 * Handles registration, login, token refresh, and logout.
 * 
 * @see /mnt/project/02-general-rules.md
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import logger from '../../libs/logger.js';
import {
    ConflictError,
    UnauthorizedError,
} from '../../utils/errors.js';
import * as authRepo from './auth.repo.js';
import type {
    AuthResponse,
    TokenResponse,
    JwtPayload,
    JwtRefreshPayload,
} from './auth.types.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';

/**
 * Password hashing rounds
 */
const BCRYPT_ROUNDS = 10;

/**
 * Parse JWT expiration string to seconds
 * 
 * @param expiration - Expiration string (e.g., '15m', '7d')
 * @returns Expiration in seconds
 */
function parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const value = parseInt(match[1]!);
    const unit = match[2]!;

    const multipliers: Record<string, number> = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
    };

    return value * multipliers[unit]!;
}

/**
 * Generate access token
 * 
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 * @returns JWT access token
 */
function generateAccessToken(
    userId: string,
    email: string,
    role: string
): string {
    const payload: JwtPayload = {
        userId,
        email,
        role: role as 'USER' | 'ADMIN',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRATION,
        issuer: env.JWT_ISSUER,
    } as jwt.SignOptions);
}

/**
 * Generate refresh token
 * 
 * @param userId - User ID
 * @param sessionId - Session ID
 * @returns JWT refresh token
 */
function generateRefreshToken(userId: string, sessionId: string): string {
    const payload: JwtRefreshPayload = {
        userId,
        sessionId,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRATION,
        issuer: env.JWT_ISSUER,
    } as jwt.SignOptions);
}

/**
 * Register a new user
 * 
 * @param data - Registration data
 * @returns User and tokens
 * @throws ConflictError if email already exists
 */
export async function register(data: RegisterInput): Promise<AuthResponse> {
    try {
        // Check if user already exists
        const existingUser = await authRepo.findUserByEmail(data.email);
        if (existingUser) {
            throw new ConflictError('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

        // Create user
        const user = await authRepo.createUser({
            email: data.email,
            password: hashedPassword,
            name: data.name,
        });

        // Generate tokens
        const accessToken = generateAccessToken(user.id, user.email, user.role);
        const sessionId = `session_${Date.now()}_${user.id}`;
        const refreshToken = generateRefreshToken(user.id, sessionId);

        // Calculate refresh token expiration
        const expiresInSeconds = parseExpiration(env.JWT_REFRESH_EXPIRATION);
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

        // Create session
        await authRepo.createSession({
            userId: user.id,
            refreshToken,
            expiresAt,
        });

        logger.info({ userId: user.id, email: user.email }, 'User registered');

        return {
            user,
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: parseExpiration(env.JWT_ACCESS_EXPIRATION),
            },
        };
    } catch (error) {
        logger.error({ error, email: data.email }, 'Registration failed');
        throw error;
    }
}

/**
 * Login user
 * 
 * @param data - Login credentials
 * @returns User and tokens
 * @throws UnauthorizedError if credentials are invalid
 */
export async function login(data: LoginInput): Promise<AuthResponse> {
    try {
        // Find user with password
        const userWithPassword = await authRepo.findUserByEmailWithPassword(
            data.email
        );

        if (!userWithPassword) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
            data.password,
            userWithPassword.password
        );

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Get user without password
        const user = await authRepo.findUserById(userWithPassword.id);
        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id, user.email, user.role);
        const sessionId = `session_${Date.now()}_${user.id}`;
        const refreshToken = generateRefreshToken(user.id, sessionId);

        // Calculate refresh token expiration
        const expiresInSeconds = parseExpiration(env.JWT_REFRESH_EXPIRATION);
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

        // Create session
        await authRepo.createSession({
            userId: user.id,
            refreshToken,
            expiresAt,
        });

        logger.info({ userId: user.id, email: user.email }, 'User logged in');

        return {
            user,
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: parseExpiration(env.JWT_ACCESS_EXPIRATION),
            },
        };
    } catch (error) {
        logger.error({ error, email: data.email }, 'Login failed');
        throw error;
    }
}

/**
 * Refresh access token
 * 
 * @param refreshToken - Refresh token
 * @returns New access and refresh tokens
 * @throws UnauthorizedError if token is invalid or expired
 */
export async function refreshTokens(
    refreshToken: string
): Promise<TokenResponse> {
    try {
        // Find session
        const session = await authRepo.findSessionByToken(refreshToken);
        if (!session) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        // Check if session expired
        if (session.expiresAt < new Date()) {
            await authRepo.deleteSession(refreshToken);
            throw new UnauthorizedError('Refresh token expired');
        }

        // Verify JWT token
        let payload: JwtRefreshPayload;
        try {
            payload = jwt.verify(refreshToken, env.JWT_SECRET, {
                issuer: env.JWT_ISSUER,
            }) as JwtRefreshPayload;
        } catch (error) {
            await authRepo.deleteSession(refreshToken);
            throw new UnauthorizedError('Invalid refresh token');
        }

        // Generate new tokens
        const newAccessToken = generateAccessToken(
            session.user.id,
            session.user.email,
            session.user.role
        );
        const sessionId = `session_${Date.now()}_${session.user.id}`;
        const newRefreshToken = generateRefreshToken(session.user.id, sessionId);

        // Calculate new expiration
        const expiresInSeconds = parseExpiration(env.JWT_REFRESH_EXPIRATION);
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

        // Update session with new refresh token
        await authRepo.updateSession(refreshToken, newRefreshToken, expiresAt);

        logger.info({ userId: session.user.id }, 'Tokens refreshed');

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: parseExpiration(env.JWT_ACCESS_EXPIRATION),
        };
    } catch (error) {
        logger.error({ error }, 'Token refresh failed');
        throw error;
    }
}

/**
 * Logout user
 * 
 * Deletes the session associated with the refresh token.
 * 
 * @param refreshToken - Refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
    try {
        await authRepo.deleteSession(refreshToken);
        logger.info('User logged out');
    } catch (error) {
        // Ignore errors if session doesn't exist
        logger.warn({ error }, 'Logout failed - session may not exist');
    }
}

/**
 * Verify access token
 * 
 * @param token - Access token
 * @returns JWT payload
 * @throws UnauthorizedError if token is invalid
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
        const payload = jwt.verify(token, env.JWT_SECRET, {
            issuer: env.JWT_ISSUER,
        }) as JwtPayload;

        return payload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Access token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Invalid access token');
        }
        throw new UnauthorizedError('Token verification failed');
    }
}


