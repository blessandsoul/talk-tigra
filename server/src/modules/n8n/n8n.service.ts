/**
 * n8n Service
 *
 * Handles communication with n8n workflows for AI-powered parsing
 */

import axios from 'axios';
import logger from '../../libs/logger.js';
import { env } from '../../config/env.js';

export class N8nService {
    private webhookUrl: string;

    constructor() {
        this.webhookUrl = env.N8N_WEBHOOK_URL;
        logger.info({ webhookUrl: this.webhookUrl }, 'n8n Service initialized');
    }

    /**
     * Test connection to n8n by sending a simple echo request
     *
     * This is used to verify that:
     * 1. The webhook URL is correct
     * 2. n8n is reachable
     * 3. The workflow returns data
     */
    async testConnection(testData: any): Promise<any> {
        try {
            logger.info({ testData }, 'Sending test request to n8n');

            const response = await axios.post(
                this.webhookUrl,
                testData,
                {
                    timeout: 10000, // 10 second timeout
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info({ response: response.data }, 'Received response from n8n');
            return response.data;
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                },
                'Failed to connect to n8n webhook'
            );
            throw error;
        }
    }

    /**
     * Send conversation text to n8n for AI parsing
     *
     * @param conversationText - The formatted conversation history
     * @param phone - The driver's phone number
     * @returns Parsed data from n8n (loadId, location, etc.)
     */
    async parseConversation(conversationText: string, phone: string): Promise<any> {
        try {
            logger.info({ phone, textLength: conversationText.length }, 'Sending conversation to n8n for parsing');

            const response = await axios.post(
                this.webhookUrl,
                {
                    text: conversationText,
                    phone,
                    timestamp: new Date().toISOString(),
                },
                {
                    timeout: 30000, // 30 second timeout for AI processing
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info({ phone, result: response.data }, 'Received parsed data from n8n');
            return response.data;
        } catch (error: any) {
            logger.error(
                {
                    error: error.message,
                    phone,
                    status: error.response?.status,
                    data: error.response?.data,
                },
                'Failed to parse conversation via n8n'
            );
            return null; // Return null on failure so we can fallback to regex
        }
    }

    /**
     * Format conversation messages into a string for AI processing
     */
    formatConversationForAI(messages: any[]): string {
        return messages
            .map((msg) => {
                const speaker = msg.direction === 'outgoing' ? 'Dispatcher' : 'Driver';
                // Use 'timestamp' field (from getConversationHistory mapping)
                const time = msg.timestamp || msg.createdAt;
                const timestamp = time ? new Date(time).toLocaleString() : 'Unknown';
                const text = msg.text || '';
                return `[${timestamp}] ${speaker}: ${text}`;
            })
            .filter(line => line.includes(': ') && !line.endsWith(': ')) // Filter out empty messages
            .join('\n');
    }
}

export const n8nService = new N8nService();
