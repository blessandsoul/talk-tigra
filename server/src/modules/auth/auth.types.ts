/**
 * Authentication Types
 * 
 * TypeScript types and interfaces for authentication module.
 * These types are used throughout the auth flow.
 */

/**
 * User Role Enum
 */
export type UserRole = 'USER' | 'ADMIN';

/**
 * User object (without sensitive fields like password)
 * 
 * This is the safe user representation returned to clients.
 */
export interface User {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Login Request Payload
 */
export interface LoginRequest {
    email: string;
    password: string;
}

/**
 * Register Request Payload
 */
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

/**
 * Token Response
 * 
 * Contains JWT tokens and expiration info.
 */
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // Seconds until access token expires
}

/**
 * Authentication Response
 * 
 * Complete response after successful login/register.
 * Contains user info and tokens.
 */
export interface AuthResponse {
    user: User;
    tokens: TokenResponse;
}

/**
 * Refresh Token Request Payload
 */
export interface RefreshTokenRequest {
    refreshToken: string;
}

/**
 * JWT Payload
 * 
 * Data stored inside the JWT access token.
 */
export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat?: number; // Issued at
    exp?: number; // Expiration
}

/**
 * JWT Refresh Payload
 * 
 * Data stored inside the JWT refresh token.
 */
export interface JwtRefreshPayload {
    userId: string;
    sessionId: string;
    iat?: number;
    exp?: number;
}
