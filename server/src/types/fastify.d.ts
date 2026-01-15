import { FastifyReply, FastifyRequest } from 'fastify';
import { JwtPayload } from '../modules/auth/auth.types.js';
import { UserRole } from '../libs/auth/rbac.middleware.js';

/**
 * TypeScript Declaration Merging
 * 
 * Extends Fastify types with custom properties.
 */
declare module 'fastify' {
    interface FastifyRequest {
        user?: JwtPayload;
        startTime: number;
    }
    interface FastifyInstance {
        authenticate: (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>;
        requireRole: (
            ...roles: UserRole[]
        ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireAdmin: () => (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>;
        requireUser: () => (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>;
        requireAny: () => (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>;
    }
}
