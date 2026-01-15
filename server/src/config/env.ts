/**
 * Environment Configuration
 * 
 * Validates and exports typed environment variables using Zod.
 * Ensures all required variables are present at startup.
 */

import { z } from 'zod';

/**
 * Environment variable schema
 * 
 * All required variables from .env.example
 */
const envSchema = z.object({
    // Server Configuration
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    API_PREFIX: z.string().default('/api/v1'),
    LOG_LEVEL: z
        .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .default('info'),

    // Database Configuration
    DATABASE_URL: z.string().url().min(1),

    // Redis Configuration
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),

    // JWT Configuration
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRATION: z.string().default('15m'),
    JWT_REFRESH_EXPIRATION: z.string().default('7d'),
    JWT_ISSUER: z.string().default('talk-tigra'),

    // CORS Configuration
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),



    // File Upload Configuration
    MAX_FILE_SIZE: z.coerce.number().int().positive().default(10485760), // 10MB
    ALLOWED_FILE_TYPES: z
        .string()
        .default('image/jpeg,image/png,image/webp,application/pdf'),
    UPLOAD_DIR: z.string().default('./uploads'),

    // Rate Limiting Configuration
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(900000), // 15 minutes

    // Development Tools
    PRISMA_QUERY_LOG: z
        .string()
        .transform((val) => val === 'true')
        .optional(),
    SLOW_QUERY_THRESHOLD: z.coerce.number().int().positive().default(1000),
});

/**
 * Validate environment variables
 * 
 * Throws error if validation fails, preventing server startup
 * with invalid configuration.
 */
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Environment validation failed:');
            console.error(JSON.stringify(error.errors, null, 2));
            process.exit(1);
        }
        throw error;
    }
};

/**
 * Typed environment configuration
 * 
 * Use this instead of process.env for type safety
 */
export const env = parseEnv();

/**
 * Type for environment variables
 */
export type Env = z.infer<typeof envSchema>;
