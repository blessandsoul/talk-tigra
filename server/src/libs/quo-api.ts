/**
 * Quo (formerly OpenPhone) API Client
 * 
 * Provides authenticated HTTP client for Quo API requests.
 * All requests automatically include the API key in the Authorization header.
 * 
 * @see https://docs.quo.com/api (or relevant Quo API documentation)
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { env } from '../config/env.js';
import logger from './logger.js';

/**
 * Quo API Base Configuration
 */
const QUO_API_BASE_URL = 'https://api.openphone.com';
const QUO_API_VERSION = 'v1';

/**
 * Quo API Client Class
 * 
 * Handles all HTTP requests to Quo API with automatic authentication.
 */
class QuoApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: `${QUO_API_BASE_URL}/${QUO_API_VERSION}`,
            timeout: 30000, // 30 seconds
            headers: {
                'Content-Type': 'application/json',
                'Authorization': env.QUO_API, // API key in Authorization header
            },
        });

        // Request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                logger.debug(
                    {
                        method: config.method?.toUpperCase(),
                        url: config.url,
                        params: config.params,
                    },
                    'Quo API request'
                );
                return config;
            },
            (error) => {
                logger.error({ error }, 'Quo API request error');
                return Promise.reject(error);
            }
        );

        // Response interceptor for logging and error handling
        this.client.interceptors.response.use(
            (response) => {
                logger.debug(
                    {
                        status: response.status,
                        url: response.config.url,
                    },
                    'Quo API response'
                );
                return response;
            },
            (error) => {
                if (error.response) {
                    // Server responded with error status
                    logger.error(
                        {
                            status: error.response.status,
                            url: error.config?.url,
                            data: error.response.data,
                        },
                        'Quo API error response'
                    );
                } else if (error.request) {
                    // Request made but no response received
                    logger.error(
                        {
                            url: error.config?.url,
                            message: error.message,
                        },
                        'Quo API no response'
                    );
                } else {
                    // Error setting up request
                    logger.error(
                        {
                            message: error.message,
                        },
                        'Quo API request setup error'
                    );
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * GET request
     */
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.get<T>(url, config);
    }

    /**
     * POST request
     */
    async post<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        return this.client.post<T>(url, data, config);
    }

    /**
     * PUT request
     */
    async put<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        return this.client.put<T>(url, data, config);
    }

    /**
     * PATCH request
     */
    async patch<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        return this.client.patch<T>(url, data, config);
    }

    /**
     * DELETE request
     */
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.delete<T>(url, config);
    }

    /**
     * Get the underlying Axios instance
     * Use this if you need direct access to Axios features
     */
    getClient(): AxiosInstance {
        return this.client;
    }
}

/**
 * Singleton instance of Quo API client
 * 
 * Import and use this in your services:
 * ```typescript
 * import { quoApiClient } from '@/libs/quo-api.js';
 * 
 * const response = await quoApiClient.get('/messages');
 * ```
 */
export const quoApiClient = new QuoApiClient();

/**
 * Export the class for testing purposes
 */
export { QuoApiClient };
