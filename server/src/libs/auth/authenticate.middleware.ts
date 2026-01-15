import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../../modules/auth/auth.service.js';
import { UnauthorizedError, AppError } from '../../utils/errors.js';

export async function authenticateMiddleware(request: FastifyRequest, reply: FastifyReply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Authentication token missing');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedError('Malformed authentication token');
        }

        const payload = await verifyAccessToken(token);
        request.user = payload;
    } catch (error) {
        throw error instanceof AppError ? error : new UnauthorizedError('Invalid or expired token');
    }
}
