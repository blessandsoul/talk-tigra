/**
 * Pickups Repository
 *
 * Database queries for the pickups module
 */

import { prisma } from '../../libs/db.js';
import type { PickupRow } from './pickups.types.js';

class PickupRepo {
    /**
     * Get all pickup records with driver opt-out status
     *
     * Cross-references driverPhone against the drivers table to check
     * if the driver has opted out (notes = "x" on the Driver record).
     */
    async findAllWithOptOutStatus() {
        const pickups = await prisma.pickup.findMany({
            orderBy: { vin: 'asc' },
        });

        // Collect unique phone numbers that have a value
        const phoneNumbers = [
            ...new Set(
                pickups
                    .map((p) => p.driverPhone)
                    .filter((p): p is string => !!p)
            ),
        ];

        // Look up which drivers have opted out (notes = "x")
        const optedOutDrivers =
            phoneNumbers.length > 0
                ? await prisma.driver.findMany({
                      where: {
                          phoneNumber: { in: phoneNumbers },
                          notes: 'x',
                      },
                      select: { phoneNumber: true },
                  })
                : [];

        const optedOutPhones = new Set(
            optedOutDrivers.map((d) => d.phoneNumber)
        );

        return pickups.map((p) => ({
            ...p,
            isOptedOut: p.driverPhone ? optedOutPhones.has(p.driverPhone) : false,
        }));
    }

    /**
     * Get all pickup records (raw, without opt-out check)
     */
    async findAll() {
        return prisma.pickup.findMany({
            orderBy: { vin: 'asc' },
        });
    }

    /**
     * Find a pickup by ID
     */
    async findById(id: string) {
        return prisma.pickup.findUnique({
            where: { id },
        });
    }

    /**
     * Upsert a pickup record by VIN
     *
     * IMPORTANT: The update clause intentionally omits `notes`
     * so that user-edited notes survive regular 10-min syncs.
     */
    async upsertPickup(data: PickupRow) {
        return prisma.pickup.upsert({
            where: { vin: data.vin },
            create: {
                vin: data.vin,
                pickupDay: data.pickupDay,
                driverPhone: data.driverPhone,
                sheetRowNumber: data.rowNumber,
                syncedAt: new Date(),
            },
            update: {
                pickupDay: data.pickupDay,
                driverPhone: data.driverPhone,
                sheetRowNumber: data.rowNumber,
                syncedAt: new Date(),
                // notes intentionally NOT updated here
            },
        });
    }

    /**
     * Delete all pickup records (used for 2PM daily reset)
     */
    async deleteAll() {
        return prisma.pickup.deleteMany({});
    }

    /**
     * Update notes for a specific pickup
     */
    async updateNotes(id: string, notes: string | null) {
        return prisma.pickup.update({
            where: { id },
            data: { notes },
        });
    }
}

export const pickupRepo = new PickupRepo();
