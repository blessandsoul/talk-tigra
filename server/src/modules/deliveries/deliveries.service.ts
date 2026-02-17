/**
 * Deliveries Service
 *
 * Business logic for the deliveries module
 */

import { deliveryRepo } from './deliveries.repo.js';
import { deliverySyncService } from './delivery-sync.service.js';
import { NotFoundError } from '../../utils/errors.js';
import type { SyncResult } from './deliveries.types.js';

class DeliveryService {
    /**
     * Get all deliveries with driver opt-out status
     */
    async getAllDeliveries() {
        return deliveryRepo.findAllWithOptOutStatus();
    }

    /**
     * Update notes for a delivery
     */
    async updateDeliveryNotes(id: string, notes: string | null) {
        const delivery = await deliveryRepo.findById(id);
        if (!delivery) {
            throw new NotFoundError('Delivery not found');
        }

        return deliveryRepo.updateNotes(id, notes);
    }

    /**
     * Manually trigger a sync from the Google Sheet
     */
    async syncDeliveries(): Promise<SyncResult> {
        return deliverySyncService.syncDeliveriesToday();
    }

    /**
     * Delete all deliveries and re-sync (used by 2PM daily reset)
     */
    async resetAndSync(): Promise<{ deleted: number; sync: SyncResult }> {
        const deleteResult = await deliveryRepo.deleteAll();
        const syncResult = await deliverySyncService.syncDeliveriesToday();
        return { deleted: deleteResult.count, sync: syncResult };
    }
}

export const deliveryService = new DeliveryService();
