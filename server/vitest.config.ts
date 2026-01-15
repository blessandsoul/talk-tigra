import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        // Enable global test APIs (describe, it, expect, etc.)
        globals: true,

        // Test environment
        environment: 'node',

        // Test file patterns
        include: ['**/*.test.ts', '**/*.spec.ts'],
        exclude: ['node_modules', 'dist', 'build', '.idea', '.git', '.cache'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                'prisma/',
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/*.config.ts',
                '**/types/**',
                '**/__tests__/**',
                '**/test/**',
            ],
            // Coverage thresholds
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 70,
                statements: 70,
            },
        },

        // Test timeout (milliseconds)
        testTimeout: 10000,

        // Hook timeout (milliseconds)
        hookTimeout: 10000,

        // Teardown timeout (milliseconds)
        teardownTimeout: 10000,

        // Setup files to run before tests
        setupFiles: ['./src/test/setup.ts'],

        // Reporter configuration
        reporters: ['verbose'],

        // Isolate tests in separate threads
        isolate: true,

        // Pool configuration (Vitest v2)
        pool: 'threads',
        poolOptions: {
            threads: {
                maxThreads: 4,
                minThreads: 1,
            },
        },

        // Retry failed tests
        retry: 0,

        // Bail on first test failure
        bail: 0,

        // Watch mode options
        watch: false,

        // Mock configuration
        mockReset: true,
        restoreMocks: true,
        clearMocks: true,

        // Silent console output during tests
        silent: false,

        // Include source files in coverage
        includeSource: ['src/**/*.ts'],
    },

    // Path resolution (match tsconfig.json paths)
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/config': path.resolve(__dirname, './src/config'),
            '@/libs': path.resolve(__dirname, './src/libs'),
            '@/modules': path.resolve(__dirname, './src/modules'),
            '@/types': path.resolve(__dirname, './src/types'),
        },
    },
});
