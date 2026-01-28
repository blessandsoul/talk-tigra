/**
 * Fix Location Assignments Script
 *
 * This script finds locations where the auctionName shows a different state
 * than what's in the address, and re-runs the matching with the fixed algorithm.
 *
 * Run: npx tsx scripts/fix-location-assignments.ts
 * Dry run: npx tsx scripts/fix-location-assignments.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Get the directory path for resolving JSON files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for dry-run mode
const DRY_RUN = process.argv.includes('--dry-run');

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

// Find matching location in list - FIXED VERSION with state validation
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
    // FIXED: Only match if state is unknown OR state matches
    for (const loc of locations) {
        if (addressUpper.includes(loc.cityUpper) && loc.cityUpper.length > 3) {
            // If we have a state from the address, it MUST match the location's state
            if (parsed.possibleState && loc.state !== parsed.possibleState) {
                continue; // State mismatch - skip this location
            }
            return loc;
        }
    }

    // Strategy 5: Significant address overlap
    // FIXED: Only match if state is unknown OR state matches
    for (const loc of locations) {
        // If we have a state from the address, it MUST match the location's state
        if (parsed.possibleState && loc.state !== parsed.possibleState) {
            continue; // State mismatch - skip this location
        }

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

// Extract state from auctionName like "MO - SPRINGFIELD" or "Springfield (MO)"
function extractStateFromAuctionName(auctionName: string): string | null {
    if (!auctionName) return null;

    // Pattern 1: "MO - SPRINGFIELD" (Copart format)
    const copartMatch = auctionName.match(/^([A-Z]{2})\s*-/);
    if (copartMatch) return copartMatch[1];

    // Pattern 2: "Springfield (MO)" (IAAI format)
    const iaaiMatch = auctionName.match(/\(([A-Z]{2})\)$/);
    if (iaaiMatch) return iaaiMatch[1];

    return null;
}

async function main() {
    console.log('=== Fix Location Assignments ===\n');
    if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    // Load auction data
    const { copart, iaai } = loadAuctionData();

    // Get all locations with auctionName set
    const locations = await prisma.location.findMany({
        where: {
            auctionName: { not: null },
        },
        orderBy: { createdAt: 'asc' },
    });

    console.log(`\nFound ${locations.length} locations with auction assignments\n`);

    let fixed = 0;
    let correct = 0;
    let cleared = 0;

    for (const location of locations) {
        // Get state from the address/name
        const addressToCheck = location.address || location.name;
        const parsed = parseAddress(addressToCheck);

        // Get state from the current auctionName
        const auctionState = extractStateFromAuctionName(location.auctionName!);

        // If we can detect a state from the address and it doesn't match the auction state, it's wrong
        if (parsed.possibleState && auctionState && parsed.possibleState !== auctionState) {
            console.log(`\n❌ MISMATCH DETECTED:`);
            console.log(`   Location: "${location.name}"`);
            console.log(`   Address: "${location.address || 'N/A'}"`);
            console.log(`   Parsed state: ${parsed.possibleState}`);
            console.log(`   Auction assigned: ${location.auctionName} (state: ${auctionState})`);

            // Re-run matching with fixed algorithm
            const newMatch = matchAddress(addressToCheck, copart, iaai);

            if (newMatch) {
                console.log(`   ✓ New match: ${newMatch.auctionName} (state: ${newMatch.state})`);

                if (!DRY_RUN) {
                    await prisma.location.update({
                        where: { id: location.id },
                        data: {
                            auctionName: newMatch.auctionName,
                            auctionType: newMatch.auctionType,
                            state: newMatch.state,
                            city: newMatch.city,
                            zipCode: newMatch.zipCode,
                        },
                    });
                }
                fixed++;
            } else {
                console.log(`   ✓ No matching auction - clearing assignment`);

                if (!DRY_RUN) {
                    await prisma.location.update({
                        where: { id: location.id },
                        data: {
                            auctionName: null,
                            auctionType: null,
                        },
                    });
                }
                cleared++;
            }
        } else {
            correct++;
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Correct assignments: ${correct}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Cleared (no match): ${cleared}`);
    console.log(`Total checked: ${locations.length}`);

    if (DRY_RUN) {
        console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.');
    }

    await prisma.$disconnect();
}

main().catch(async (error) => {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
});
