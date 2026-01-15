import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import jsonwebtoken from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError, InternalError } from '../utils/errors.js';

export function setupErrorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    // 1. Log the error internally
    request.log.error({
        err: error,
        requestId: request.id,
        userId: request.user?.userId,
        path: request.url,
    });

    // 2. Handle known AppErrors
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });
    }

    // 3. Handle Zod Validation Errors
    if (error instanceof ZodError) {
        return reply.status(400).send({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.errors[0]?.message || 'Invalid input data',
                details: error.errors,
            },
        });
    }

    // 4. Handle Prisma Database Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint failed
        if (error.code === 'P2002') {
            return reply.status(409).send({
                success: false,
                error: { code: 'CONFLICT', message: 'Resource already exists' },
            });
        }
        // P2025: Record not found
        if (error.code === 'P2025') {
            return reply.status(404).send({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Resource not found' },
            });
        }
    }

    // 5. Handle JWT Errors explicitly
    if (error instanceof jsonwebtoken.TokenExpiredError) {
        return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        });
    }

    if (error instanceof jsonwebtoken.JsonWebTokenError) {
        return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
        });
    }

    // 6. Handle Rate Limit Errors
    if (reply.statusCode === 429) {
        return reply.send(error); // Keep custom error from rate-limit plugin
    }

    // 7. Fallback: Internal Server Error
    const internalError = new InternalError();
    return reply.status(500).send({
        success: false,
        error: {
            code: internalError.code,
            message: env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : error.message,
        },
    });
}
