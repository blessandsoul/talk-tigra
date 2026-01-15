/**
 * Logger Configuration
 * 
 * Pino logger with structured logging and sensitive data redaction.
 * 
 * @see /mnt/project/08-observability.md
 */

import pino from 'pino';

/**
 * Create Pino logger instance
 * 
 * Features:
 * - Structured JSON logging in production
 * - Pretty-printed logs in development
 * - Automatic redaction of sensitive data
 * - Configurable log levels
 */
const logger = pino({
    // Log level from environment or default to 'info'
    level: process.env.LOG_LEVEL || 'info',

    // Pretty printing in development only
    transport:
        process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            }
            : undefined,

    // Redact sensitive data
    redact: {
        paths: [
            'req.headers.authorization',
            '*.password',
            '*.token',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.accessToken',
            'res.headers.authorization',
        ],
        censor: '[REDACTED]',
    },

    // Base configuration
    base: {
        env: process.env.NODE_ENV || 'development',
    },

    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
