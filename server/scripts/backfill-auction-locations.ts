/**
 * Backfill Auction Location Names Script
 *
 * This script updates existing locations with their auction name and type
 * by matching against copart.json and iaa.json data files.
 *
 * Run: npx tsx scripts/backfill-auction-locations.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Get the directory path for resolving JSON files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
type AuctionType = 'COPART' | 'IAAI';

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

interface IAAILocation {
    _id: string;
    name: string;
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

interface AuctionLocationResult {
    auctionName: string;
    auctionType: AuctionType;
    state: string;
    city: string;
    zipCode?: string;
}

// Load auction data
function loadAuctionData(): { copart: FlattenedLocation[]; iaai: FlattenedLocation[] } {
    const copartLocations: FlattenedLocation[] = [];
    const iaaiLocations: FlattenedLocation[] = [];

    // Load Copart locations
    const copartPath = join(__dirname, '../copart.json');
    const copartData: CopartState[] = JSON.parse(readFileSync(copartPath, 'utf-8'));

    for (const stateData of copartData) {
        for (const loc of stateData.locations) {
            const cityFromName = loc.name.replace(/^COPART\s+/i, '').replace(/^CRASHEDTOYS\s+/i, '');
            const formattedName = `${stateData.state} - ${cityFromName}`;

            copartLocations.push({
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
    const iaaiPath = join(__dirname, '../iaa.json');
    const iaaiData: IAAIState[] = JSON.parse(readFileSync(iaaiPath, 'utf-8'));

    for (const stateData of iaaiData) {
        for (const loc of stateData.locations) {
            iaaiLocations.push({
                auctionType: 'IAAI',
                state: stateData.state.toUpperCase(),
                city: loc.city,
                cityUpper: loc.city.toUpperCase(),
                address: loc.address,
                addressUpper: loc.address.toUpperCase(),
                zip: loc.zip,
                originalName: loc.name,
                formattedName: loc.name,
            });
        }
    }

    console.log(`Loaded ${copartLocations.length} Copart locations`);
    console.log(`Loaded ${iaaiLocations.length} IAAI locations`);

    return { copart: copartLocations, iaai: iaaiLocations };
}

// Parse address components
function parseAddress(fullAddress: string): {
    addressParts: string[];
    possibleCity: string | null;
    possibleState: string | null;
    possibleZip: string | null;
} {
    const upper = fullAddress.toUpperCase().trim();
    const parts = upper.split(/[,\s]+/).filter(p => p.length > 0);

    const zipMatch = upper.match(/\b(\d{5})(?:-\d{4})?\b/);
    const possibleZip = zipMatch ? zipMatch[1] : null;

    const statePattern = /\b([A-Z]{2})\b/g;
    const stateMatches: string[] = [];
    let match;
    while ((match = statePattern.exec(upper)) !== null) {
        stateMatches.push(match[1]);
    }
    const possibleState = stateMatches.length > 0 ? stateMatches[stateMatches.length - 1] : null;

    let possibleCity: string | null = null;
    if (possibleState) {
        const beforeState = upper.split(possibleState)[0];
        const words = beforeState.split(/[,\s]+/).filter(p => p.length > 0);
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

// Find matching location in list
function findMatchInList(
    locations: FlattenedLocation[],
    addressUpper: string,
    parsed: ReturnType<typeof parseAddress>
): FlattenedLocation | null {
    // Strategy 1: Exact zip code match
    if (parsed.possibleZip) {
        const zipMatch = locations.find(loc => loc.zip === parsed.possibleZip);
        if (zipMatch) return zipMatch;
    }

    // Strategy 2: State + City match
    if (parsed.possibleState && parsed.possibleCity) {
        const stateCity = locations.find(loc =>
            loc.state === parsed.possibleState &&
            (loc.cityUpper === parsed.possibleCity ||
             loc.cityUpper.includes(parsed.possibleCity!) ||
             parsed.possibleCity!.includes(loc.cityUpper))
        );
        if (stateCity) return stateCity;
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

    // Strategy 5: Significant address overlap
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

// Match address to auction location
function matchAddress(
    fullAddress: string,
    copartLocations: FlattenedLocation[],
    iaaiLocations: FlattenedLocation[]
): AuctionLocationResult | null {
    if (!fullAddress || fullAddress.trim().length === 0) {
        return null;
    }

    const parsed = parseAddress(fullAddress);
    const addressUpper = fullAddress.toUpperCase();

    // Try IAAI first
    const iaaiMatch = findMatchInList(iaaiLocations, addressUpper, parsed);
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
    const copartMatch = findMatchInList(copartLocations, addressUpper, parsed);
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

async function main() {
    console.log('=== Backfill Auction Location Names ===\n');

    // Load auction data
    const { copart, iaai } = loadAuctionData();

    // Get all locations from database
    const locations = await prisma.location.findMany({
        orderBy: { createdAt: 'asc' },
    });

    console.log(`\nFound ${locations.length} locations in database\n`);

    let updated = 0;
    let alreadyMatched = 0;
    let noMatch = 0;

    for (const location of locations) {
        // Skip if already has auction info
        if (location.auctionType) {
            alreadyMatched++;
            continue;
        }

        // Try to match using address or name
        const addressToMatch = location.address || location.name;
        const auctionMatch = matchAddress(addressToMatch, copart, iaai);

        if (auctionMatch) {
            await prisma.location.update({
                where: { id: location.id },
                data: {
                    auctionName: auctionMatch.auctionName,
                    auctionType: auctionMatch.auctionType,
                    state: location.state || auctionMatch.state,
                    city: location.city || auctionMatch.city,
                    zipCode: location.zipCode || auctionMatch.zipCode,
                },
            });

            console.log(`✓ Updated: "${location.name}" -> ${auctionMatch.auctionType}: ${auctionMatch.auctionName}`);
            updated++;
        } else {
            console.log(`✗ No match: "${location.name}" (address: ${location.address || 'N/A'})`);
            noMatch++;
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Already matched: ${alreadyMatched}`);
    console.log(`Updated: ${updated}`);
    console.log(`No match found: ${noMatch}`);
    console.log(`Total: ${locations.length}`);

    await prisma.$disconnect();
}

main().catch(async (error) => {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
});
