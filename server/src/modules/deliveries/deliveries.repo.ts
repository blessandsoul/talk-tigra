/**
 * Deliveries Repository
 *
 * Database queries for the deliveries module
 */

import { prisma } from '../../libs/db.js';
import type { DeliveryRow } from './deliveries.types.js';

class DeliveryRepo {
    /**
     * Get all delivery records with driver opt-out status
     *
     * Cross-references driverPhone against the drivers table to check
     * if the driver has opted out (notes = "x" on the Driver record).
     */
    async findAllWithOptOutStatus() {
        const deliveries = await prisma.delivery.findMany({
            orderBy: { vin: 'asc' },
        });

        // Collect unique phone numbers that have a value
        const phoneNumbers = [
            ...new Set(
                deliveries
                    .map((d) => d.driverPhone)
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

        return deliveries.map((d) => ({
            ...d,
            isOptedOut: d.driverPhone ? optedOutPhones.has(d.driverPhone) : false,
        }));
    }

    /**
     * Get all delivery records (raw, without opt-out check)
     */
    async findAll() {
        return prisma.delivery.findMany({
            orderBy: { vin: 'asc' },
        });
    }

    /**
     * Find a delivery by ID
     */
    async findById(id: string) {
        return prisma.delivery.findUnique({
            where: { id },
        });
    }

    /**
     * Upsert a delivery record by VIN
     *
     * IMPORTANT: The update clause intentionally omits `notes`
     * so that user-edited notes survive regular 10-min syncs.
     */
    async upsertDelivery(data: DeliveryRow) {
        return prisma.delivery.upsert({
            where: { vin: data.vin },
            create: {
                vin: data.vin,
                deliveryDay: data.deliveryDay,
                driverPhone: data.driverPhone,
                sheetRowNumber: data.rowNumber,
                syncedAt: new Date(),
            },
            update: {
                deliveryDay: data.deliveryDay,
                driverPhone: data.driverPhone,
                sheetRowNumber: data.rowNumber,
                syncedAt: new Date(),
                // notes intentionally NOT updated here
            },
        });
    }

    /**
     * Delete all delivery records (used for 2PM daily reset)
     */
    async deleteAll() {
        return prisma.delivery.deleteMany({});
    }

    /**
     * Update notes for a specific delivery
     */
    async updateNotes(id: string, notes: string | null) {
        return prisma.delivery.update({
            where: { id },
            data: { notes },
        });
    }
}

export const deliveryRepo = new DeliveryRepo();
