/**
 * Auction Location Lookup Service
 *
 * Matches addresses to auction locations (Copart, IAAI)
 * and returns formatted location names for display
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

// Get the directory path for resolving JSON files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auction types
export type AuctionType = 'COPART' | 'IAAI';

// Result from auction lookup
export interface AuctionLocationResult {
    auctionName: string;
    auctionType: AuctionType;
    state: string;
    city: string;
    zipCode?: string;
}

// Copart location structure
interface CopartLocation {
    _id: string;
    name: string;
    city: string;
    address: string;
    zip: string;
    phone: string;
}

interface CopartState {
    _id: string;
    state: string;
    locations: CopartLocation[];
}

// IAAI location structure (same structure but different name format)
interface IAAILocation {
    _id: string;
    name: string; // Already formatted as "City (STATE)"
    city: string;
    address: string;
    zip: string;
    phone: string;
}

interface IAAIState {
    _id: string;
    state: string;
    locations: IAAILocation[];
}

// Flattened location for easier searching
interface FlattenedLocation {
    auctionType: AuctionType;
    state: string;
    city: string;
    cityUpper: string;
    address: string;
    addressUpper: string;
    zip: string;
    originalName: string;
    formattedName: string;
}

class AuctionLocationService {
    private copartLocations: FlattenedLocation[] = [];
    private iaaiLocations: FlattenedLocation[] = [];
    private initialized = false;

    /**
     * Initialize by loading auction location data
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Load Copart locations
            const copartPath = join(__dirname, '../../copart.json');
            const copartData: CopartState[] = JSON.parse(readFileSync(copartPath, 'utf-8'));

            for (const stateData of copartData) {
                for (const loc of stateData.locations) {
                    // Extract just the location name from Copart naming (e.g., "COPART HAMPTON" -> "HAMPTON")
                    const cityFromName = loc.name.replace(/^COPART\s+/i, '').replace(/^CRASHEDTOYS\s+/i, '');
                    // Format as "STATE - CITY_NAME"
                    const formattedName = `${stateData.state} - ${cityFromName}`;

                    this.copartLocations.push({
                        auctionType: 'COPART',
                        state: stateData.state.toUpperCase(),
                        city: loc.city,
                        cityUpper: loc.city.toUpperCase(),
                        address: loc.address,
                        addressUpper: loc.address.toUpperCase(),
                        zip: loc.zip,
                        originalName: loc.name,
                        formattedName,
                    });
                }
            }

            // Load IAAI locations
            const iaaiPath = join(__dirname, '../../iaa.json');
            const iaaiData: IAAIState[] = JSON.parse(readFileSync(iaaiPath, 'utf-8'));

            for (const stateData of iaaiData) {
                for (const loc of stateData.locations) {
                    // IAAI name is already formatted as "City (STATE)"
                    this.iaaiLocations.push({
                        auctionType: 'IAAI',
                        state: stateData.state.toUpperCase(),
                        city: loc.city,
                        cityUpper: loc.city.toUpperCase(),
                        address: loc.address,
                        addressUpper: loc.address.toUpperCase(),
                        zip: loc.zip,
                        originalName: loc.name,
                        formattedName: loc.name, // Already formatted
                    });
                }
            }

            this.initialized = true;
            logger.info({
                copartCount: this.copartLocations.length,
                iaaiCount: this.iaaiLocations.length
            }, 'Auction location service initialized');
        } catch (error) {
            logger.error({ error }, 'Failed to initialize auction location service');
            throw error;
        }
    }

    /**
     * Parse address components from a full address string
     */
    private parseAddress(fullAddress: string): {
        addressParts: string[];
        possibleCity: string | null;
        possibleState: string | null;
        possibleZip: string | null;
    } {
        const upper = fullAddress.toUpperCase().trim();
        const parts = upper.split(/[,\s]+/).filter(p => p.length > 0);

        // Look for zip code (5 digits, optionally with -4 extension)
        const zipMatch = upper.match(/\b(\d{5})(?:-\d{4})?\b/);
        const possibleZip = zipMatch ? zipMatch[1] : null;

        // Look for state (2-letter code at the end or before zip)
        const statePattern = /\b([A-Z]{2})\b/g;
        const stateMatches: string[] = [];
        let match;
        while ((match = statePattern.exec(upper)) !== null) {
            stateMatches.push(match[1]);
        }
        // Usually state is near the end
        const possibleState = stateMatches.length > 0 ? stateMatches[stateMatches.length - 1] : null;

        // Try to extract city - usually before state or after street address
        let possibleCity: string | null = null;
        if (possibleState) {
            const beforeState = upper.split(possibleState)[0];
            const words = beforeState.split(/[,\s]+/).filter(p => p.length > 0);
            // City is typically the last 1-3 words before state that aren't numbers
            const cityWords: string[] = [];
            for (let i = words.length - 1; i >= 0 && cityWords.length < 3; i--) {
                const word = words[i];
                if (word && !/^\d+$/.test(word) && word.length > 1) {
                    cityWords.unshift(word);
                } else if (cityWords.length > 0) {
                    break;
                }
            }
            possibleCity = cityWords.join(' ') || null;
        }

        return {
            addressParts: parts,
            possibleCity,
            possibleState,
            possibleZip,
        };
    }

    /**
     * Match an address to an auction location
     */
    async matchAddress(fullAddress: string): Promise<AuctionLocationResult | null> {
        await this.initialize();

        if (!fullAddress || fullAddress.trim().length === 0) {
            return null;
        }

        const parsed = this.parseAddress(fullAddress);
        const addressUpper = fullAddress.toUpperCase();

        // Try IAAI first (more specific address format typically)
        const iaaiMatch = this.findMatchInList(
            this.iaaiLocations,
            addressUpper,
            parsed
        );
        if (iaaiMatch) {
            return {
                auctionName: iaaiMatch.formattedName,
                auctionType: 'IAAI',
                state: iaaiMatch.state,
                city: iaaiMatch.city,
                zipCode: iaaiMatch.zip,
            };
        }

        // Try Copart
        const copartMatch = this.findMatchInList(
            this.copartLocations,
            addressUpper,
            parsed
        );
        if (copartMatch) {
            return {
                auctionName: copartMatch.formattedName,
                auctionType: 'COPART',
                state: copartMatch.state,
                city: copartMatch.city,
                zipCode: copartMatch.zip,
            };
        }

        return null;
    }

    /**
     * Find a matching location in the list
     */
    private findMatchInList(
        locations: FlattenedLocation[],
        addressUpper: string,
        parsed: ReturnType<typeof this.parseAddress>
    ): FlattenedLocation | null {
        // Strategy 1: Exact zip code match (most reliable)
        if (parsed.possibleZip) {
            const zipMatch = locations.find(loc => loc.zip === parsed.possibleZip);
            if (zipMatch) {
                return zipMatch;
            }
        }

        // Strategy 2: State + City match
        if (parsed.possibleState && parsed.possibleCity) {
            const stateCity = locations.find(loc =>
                loc.state === parsed.possibleState &&
                (loc.cityUpper === parsed.possibleCity ||
                 loc.cityUpper.includes(parsed.possibleCity!) ||
                 parsed.possibleCity!.includes(loc.cityUpper))
            );
            if (stateCity) {
                return stateCity;
            }
        }

        // Strategy 3: City name appears in address with matching state
        if (parsed.possibleState) {
            const stateLocations = locations.filter(loc => loc.state === parsed.possibleState);
            for (const loc of stateLocations) {
                if (addressUpper.includes(loc.cityUpper)) {
                    return loc;
                }
            }
        }

        // Strategy 4: Address contains any known city name
        for (const loc of locations) {
            if (addressUpper.includes(loc.cityUpper) && loc.cityUpper.length > 3) {
                return loc;
            }
        }

        // Strategy 5: Significant address overlap (street name matching)
        for (const loc of locations) {
            const addressWords = loc.addressUpper.split(/\s+/);
            const significantWords = addressWords.filter(w =>
                w.length > 3 &&
                !/^\d+$/.test(w) &&
                !['STREET', 'ST', 'ROAD', 'RD', 'AVENUE', 'AVE', 'BLVD', 'DRIVE', 'DR', 'LANE', 'LN', 'WAY', 'HIGHWAY', 'HWY'].includes(w)
            );

            const matchCount = significantWords.filter(word => addressUpper.includes(word)).length;
            if (matchCount >= 2) {
                return loc;
            }
        }

        return null;
    }

    /**
     * Get all Copart locations
     */
    async getCopartLocations(): Promise<FlattenedLocation[]> {
        await this.initialize();
        return this.copartLocations;
    }

    /**
     * Get all IAAI locations
     */
    async getIAAILocations(): Promise<FlattenedLocation[]> {
        await this.initialize();
        return this.iaaiLocations;
    }
}

export const auctionLocationService = new AuctionLocationService();
