/**
 * Google Sheets Client
 * 
 * Client for reading data from Google Sheets
 */

import { google, sheets_v4 } from 'googleapis';
import { env } from '../config/env.js';
import logger from './logger.js';

/**
 * Google Sheets Client Class
 */
class GoogleSheetsClient {
    private sheets: sheets_v4.Sheets | null = null;
    private initialized: boolean = false;

    /**
     * Initialize the Google Sheets client
     */
    async initialize(): Promise<boolean> {
        if (this.initialized) return true;

        try {
            // Check if credentials are configured
            if (!env.GOOGLE_SHEETS_CREDENTIALS) {
                logger.warn('GOOGLE_SHEETS_CREDENTIALS not configured, Google Sheets sync disabled');
                return false;
            }

            // Decode base64 credentials
            const credentialsJson = Buffer.from(env.GOOGLE_SHEETS_CREDENTIALS, 'base64').toString('utf-8');
            const credentials = JSON.parse(credentialsJson);

            // Create auth client
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });

            // Create sheets client
            this.sheets = google.sheets({ version: 'v4', auth });
            this.initialized = true;

            logger.info('Google Sheets client initialized successfully');
            return true;
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to initialize Google Sheets client');
            return false;
        }
    }

    /**
     * Get data from a specific range in the sheet
     */
    async getSheetData(
        spreadsheetId: string,
        range: string
    ): Promise<any[][] | null> {
        if (!this.sheets) {
            const initialized = await this.initialize();
            if (!initialized) return null;
        }

        try {
            const response = await this.sheets!.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            return response.data.values || [];
        } catch (error: any) {
            logger.error(
                { error: error.message, spreadsheetId, range },
                'Failed to fetch data from Google Sheets'
            );
            throw error;
        }
    }

    /**
     * Get all data from the first sheet
     */
    async getAllData(spreadsheetId: string): Promise<any[][] | null> {
        return this.getSheetData(spreadsheetId, 'A:Z'); // Get all columns
    }
}

export const googleSheetsClient = new GoogleSheetsClient();
