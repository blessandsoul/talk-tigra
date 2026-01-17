/**
 * Location Normalizer
 *
 * Improvement #5: Smart location matching with fuzzy search
 * Handles variations like "Miami" vs "Miami, FL", "NJ" vs "Newark, NJ"
 */

import { prisma } from './db.js';
import logger from './logger.js';

// Common US state abbreviations and full names
const STATE_MAPPINGS: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY',
};

// Reverse mapping (abbreviation -> full name)
const STATE_ABBREV_TO_FULL: Record<string, string> = {};
for (const [_full, abbrev] of Object.entries(STATE_MAPPINGS)) {
    STATE_ABBREV_TO_FULL[abbrev.toLowerCase()] = abbrev;
}

export class LocationNormalizer {
    /**
     * Normalize a raw location string to a standard format
     * 
     * Examples:
     * - "Miami" -> "Miami, FL" (if alias exists)
     * - "miami florida" -> "Miami, FL"
     * - "NJ" -> "NJ" (state-only location)
     * - "Newark, New Jersey" -> "Newark, NJ"
     */
    async normalizeLocation(rawLocation: string): Promise<string> {
        if (!rawLocation) return rawLocation;

        const cleaned = rawLocation.trim();

        // Step 1: Check if this exact string exists as an alias
        const alias = await prisma.locationAlias.findUnique({
            where: { alias: cleaned.toLowerCase() },
            include: { location: true },
        });

        if (alias) {
            logger.debug({ raw: rawLocation, normalized: alias.location.name }, 'Location matched via alias');
            return alias.location.name;
        }

        // Step 2: Check if exact location exists in DB
        const exactMatch = await prisma.location.findUnique({
            where: { name: cleaned },
        });

        if (exactMatch) {
            return exactMatch.name;
        }

        // Step 3: Try to parse and normalize the format
        const normalized = this.parseAndNormalize(cleaned);

        // Step 4: Check if normalized version exists
        const normalizedMatch = await prisma.location.findUnique({
            where: { name: normalized },
        });

        if (normalizedMatch) {
            // Create alias for future lookups
            await this.createAlias(cleaned.toLowerCase(), normalizedMatch.id);
            return normalizedMatch.name;
        }

        // Step 5: Try fuzzy matching on city name only
        const parts = normalized.split(',').map(p => p.trim());
        if (parts[0]) {
            const fuzzyMatch = await prisma.location.findFirst({
                where: {
                    OR: [
                        { city: { contains: parts[0] } },
                        { name: { contains: parts[0] } },
                    ],
                },
            });

            if (fuzzyMatch) {
                logger.debug({ raw: rawLocation, normalized: fuzzyMatch.name }, 'Location matched via fuzzy search');
                await this.createAlias(cleaned.toLowerCase(), fuzzyMatch.id);
                return fuzzyMatch.name;
            }
        }

        // No match found - return the normalized version (new location will be created)
        logger.debug({ raw: rawLocation, normalized }, 'No existing location found, using normalized format');
        return normalized;
    }

    /**
     * Parse and normalize a location string to "City, ST" format
     */
    private parseAndNormalize(location: string): string {
        // Handle comma-separated format: "City, State"
        if (location.includes(',')) {
            const parts = location.split(',').map(p => p.trim());
            const city = this.capitalizeWords(parts[0] || '');
            const state = this.normalizeState(parts[1] || '');
            return state ? `${city}, ${state}` : city;
        }

        // Handle space-separated: "City State" or "City, State"
        const words = location.split(/\s+/);

        // Check if last word is a state
        if (words.length >= 2) {
            const lastWord = words[words.length - 1] || '';
            const state = this.normalizeState(lastWord);

            if (state) {
                const city = this.capitalizeWords(words.slice(0, -1).join(' '));
                return `${city}, ${state}`;
            }
        }

        // Check if just a state abbreviation (e.g., "NJ", "FL")
        const asState = this.normalizeState(location);
        if (asState && asState.length === 2) {
            return asState; // Return state-only
        }

        // Just a city name
        return this.capitalizeWords(location);
    }

    /**
     * Normalize a state name or abbreviation to 2-letter code
     */
    private normalizeState(state: string): string {
        if (!state) return '';

        const lower = state.toLowerCase().trim();

        // Already a 2-letter code
        if (lower.length === 2 && STATE_ABBREV_TO_FULL[lower]) {
            return lower.toUpperCase();
        }

        // Full state name
        if (STATE_MAPPINGS[lower]) {
            return STATE_MAPPINGS[lower];
        }

        return state.toUpperCase();
    }

    /**
     * Capitalize first letter of each word
     */
    private capitalizeWords(str: string): string {
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Create a location alias for future lookups
     */
    private async createAlias(alias: string, locationId: string): Promise<void> {
        try {
            await prisma.locationAlias.create({
                data: { alias, locationId },
            });
            logger.info({ alias, locationId }, 'Created location alias');
        } catch (error: any) {
            // Ignore duplicate alias errors
            if (!error.message.includes('Unique constraint')) {
                logger.warn({ error: error.message, alias }, 'Failed to create location alias');
            }
        }
    }

    /**
     * Add a manual alias mapping
     */
    async addAlias(alias: string, canonicalLocationName: string): Promise<boolean> {
        const location = await prisma.location.findUnique({
            where: { name: canonicalLocationName },
        });

        if (!location) {
            logger.warn({ alias, canonicalLocationName }, 'Cannot create alias - location not found');
            return false;
        }

        await this.createAlias(alias.toLowerCase(), location.id);
        return true;
    }
}

export const locationNormalizer = new LocationNormalizer();
