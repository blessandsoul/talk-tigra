/**
 * Error Handling Utilities
 * 
 * All errors thrown in the application MUST extend AppError.
 * This ensures consistent error responses across the API.
 * 
 * @see /mnt/project/06-response-handling.md
 */

/**
 * Base error class for all application errors
 * 
 * @property {number} statusCode - HTTP status code
 * @property {string} code - Machine-readable error code
 * @property {string} message - Human-readable error message
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, code: string) {
        super(message);

        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        // Maintains proper stack trace for where error was thrown (V8 only)
        Error.captureStackTrace(this, this.constructor);

        // Set the prototype explicitly for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * 400 Bad Request
 * Use when client sends invalid data or malformed requests
 */
export class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400, 'BAD_REQUEST');
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

/**
 * 401 Unauthorized
 * Use when authentication is required but missing or invalid
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

/**
 * 403 Forbidden
 * Use when user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * 404 Not Found
 * Use when requested resource does not exist
 */
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * 409 Conflict
 * Use when request conflicts with current state (e.g., duplicate email)
 */
export class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(message, 409, 'CONFLICT');
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

/**
 * 500 Internal Server Error
 * Use for unexpected server errors
 */
export class InternalError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'INTERNAL_ERROR');
        Object.setPrototypeOf(this, InternalError.prototype);
    }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}
