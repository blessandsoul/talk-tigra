/**
 * Pickups Service
 *
 * Business logic for the pickups module
 */

import { pickupRepo } from './pickups.repo.js';
import { pickupSyncService } from './pickup-sync.service.js';
import { NotFoundError } from '../../utils/errors.js';
import type { SyncResult } from './pickups.types.js';

class PickupService {
    /**
     * Get all pickups with driver opt-out status
     */
    async getAllPickups() {
        return pickupRepo.findAllWithOptOutStatus();
    }

    /**
     * Update notes for a pickup
     */
    async updatePickupNotes(id: string, notes: string | null) {
        const pickup = await pickupRepo.findById(id);
        if (!pickup) {
            throw new NotFoundError('Pickup not found');
        }

        return pickupRepo.updateNotes(id, notes);
    }

    /**
     * Manually trigger a sync from the Google Sheet
     */
    async syncPickups(): Promise<SyncResult> {
        return pickupSyncService.syncPickupsToday();
    }

    /**
     * Delete all pickups and re-sync (used by 2PM daily reset)
     */
    async resetAndSync(): Promise<{ deleted: number; sync: SyncResult }> {
        const deleteResult = await pickupRepo.deleteAll();
        const syncResult = await pickupSyncService.syncPickupsToday();
        return { deleted: deleteResult.count, sync: syncResult };
    }
}

export const pickupService = new PickupService();
