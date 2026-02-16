/**
 * Load ID Regex Extractor
 *
 * Backup service for extracting load IDs (last 6 of VIN) from conversation text
 * when the AI service (n8n) is down or fails to find any.
 *
 * Load ID format: 6 alphanumeric characters with at least 1 digit
 * Examples: "ABC123", "123456", "A1B2C3"
 */

import logger from './logger.js';

/**
 * Extract potential load IDs from raw conversation text using regex patterns
 *
 * @param text - Raw conversation text (all messages joined)
 * @returns Array of unique potential load IDs (uppercase)
 */
export function extractLoadIdsFromText(text: string): string[] {
    const loadIds = new Set<string>();

    // Pattern 1: 6-char alphanumeric with at least 1 digit (core pattern)
    // The lookahead (?=[A-Z0-9]*\d) ensures at least one digit exists
    const corePattern = /\b(?=[A-Z0-9]*\d)[A-Z0-9]{6}\b/gi;
    for (const match of text.matchAll(corePattern)) {
        loadIds.add(match[0].toUpperCase());
    }

    // Pattern 2: "load XXXXXX" or "load id: XXXXXX" (contextual - captures 4-6 char IDs)
    const loadPhrasePattern = /load\s*(?:id)?[:\s]*([A-Z0-9]{4,6})/gi;
    for (const match of text.matchAll(loadPhrasePattern)) {
        const captured = match[1];
        if (captured && captured.length === 6 && /\d/.test(captured)) {
            loadIds.add(captured.toUpperCase());
        }
    }

    // Pattern 3: "VIN ending in XXXXXX" or "last 6: XXXXXX"
    const vinPattern = /(?:vin|last\s*6)[:\s]*([A-Z0-9]{6})/gi;
    for (const match of text.matchAll(vinPattern)) {
        const captured = match[1];
        if (captured && /\d/.test(captured)) {
            loadIds.add(captured.toUpperCase());
        }
    }

    const results = Array.from(loadIds);

    if (results.length > 0) {
        logger.info(
            { count: results.length, loadIds: results.slice(0, 10) },
            '[REGEX FALLBACK] Extracted load IDs from conversation text'
        );
    }

    return results;
}
