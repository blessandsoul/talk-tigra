/**
 * Quo API Client Tests
 * 
 * Tests for the Quo API client authentication and request handling
 */

import { describe, it, expect, vi } from 'vitest';

// Mock axios module
vi.mock('axios', () => {
    const mockAxiosInstance = {
        get: vi.fn().mockResolvedValue({ data: { success: true } }),
        post: vi.fn().mockResolvedValue({ data: { success: true } }),
        put: vi.fn().mockResolvedValue({ data: { success: true } }),
        patch: vi.fn().mockResolvedValue({ data: { success: true } }),
        delete: vi.fn().mockResolvedValue({ data: { success: true } }),
        interceptors: {
            request: {
                use: vi.fn((onFulfilled) => {
                    // Store the interceptor for testing
                    return 0;
                }),
            },
            response: {
                use: vi.fn((onFulfilled, onRejected) => {
                    // Store the interceptor for testing
                    return 0;
                }),
            },
        },
    };

    return {
        default: {
            create: vi.fn(() => mockAxiosInstance),
        },
        __mockInstance: mockAxiosInstance,
    };
});

import axios from 'axios';
import { quoApiClient } from '../libs/quo-api.js';

describe('QuoApiClient', () => {
    const mockInstance = (axios as any).__mockInstance;

    describe('HTTP Methods', () => {
        it('should make GET request', async () => {
            const result = await quoApiClient.get('/test');

            expect(mockInstance.get).toHaveBeenCalledWith('/test', undefined);
            expect(result.data).toEqual({ success: true });
        });

        it('should make GET request with params', async () => {
            const params = { limit: 10, page: 1 };
            await quoApiClient.get('/test', { params });

            expect(mockInstance.get).toHaveBeenCalledWith('/test', { params });
        });

        it('should make POST request', async () => {
            const payload = { name: 'Test' };
            const result = await quoApiClient.post('/test', payload);

            expect(mockInstance.post).toHaveBeenCalledWith('/test', payload, undefined);
            expect(result.data).toEqual({ success: true });
        });

        it('should make PUT request', async () => {
            const payload = { name: 'Updated' };
            const result = await quoApiClient.put('/test/123', payload);

            expect(mockInstance.put).toHaveBeenCalledWith('/test/123', payload, undefined);
            expect(result.data).toEqual({ success: true });
        });

        it('should make PATCH request', async () => {
            const payload = { status: 'active' };
            const result = await quoApiClient.patch('/test/123', payload);

            expect(mockInstance.patch).toHaveBeenCalledWith('/test/123', payload, undefined);
            expect(result.data).toEqual({ success: true });
        });

        it('should make DELETE request', async () => {
            const result = await quoApiClient.delete('/test/123');

            expect(mockInstance.delete).toHaveBeenCalledWith('/test/123', undefined);
            expect(result.data).toEqual({ success: true });
        });
    });

    describe('Client Configuration', () => {
        it('should create axios instance with correct base URL', () => {
            expect(axios.default.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: expect.stringContaining('api.quo.com'),
                    timeout: 30000,
                })
            );
        });

        it('should include Authorization header in config', () => {
            const createCall = (axios.default.create as any).mock.calls[0][0];
            expect(createCall.headers).toHaveProperty('Authorization');
            expect(createCall.headers.Authorization).toBeTruthy();
        });

        it('should set Content-Type header', () => {
            const createCall = (axios.default.create as any).mock.calls[0][0];
            expect(createCall.headers['Content-Type']).toBe('application/json');
        });
    });

    describe('Interceptors', () => {
        it('should register request interceptor', () => {
            expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
        });

        it('should register response interceptor', () => {
            expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
        });
    });

    describe('Client Access', () => {
        it('should provide access to underlying axios instance', () => {
            const client = quoApiClient.getClient();
            expect(client).toBeDefined();
            expect(client).toHaveProperty('get');
            expect(client).toHaveProperty('post');
        });
    });
});
