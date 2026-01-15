import { vi, beforeAll } from 'vitest';

// Pre-fill process.env with required values for tests
// This ensures zod validation in src/config/env.ts passes
process.env['DATABASE_URL'] = process.env['DATABASE_URL'] || 'mysql://root:root@localhost:3306/test_db';
process.env['JWT_SECRET'] = process.env['JWT_SECRET'] || 'test-secret-must-be-at-least-32-chars-long-for-validation';
process.env['NODE_ENV'] = 'test';

// Global mocks if needed
console.log('Test setup loaded');

// Mock database globally to prevent connection attempts
vi.mock('@/libs/db', () => ({
    prisma: {
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        $on: vi.fn(),
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        session: {
            create: vi.fn(),
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    },
}));

// Mock redis globally
vi.mock('@/libs/redis', () => ({
    redis: {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        ping: vi.fn(),
    },
}));
