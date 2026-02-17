/**
 * Pickup Types
 *
 * Type definitions for the pickups module
 */

export interface PickupRow {
    rowNumber: number;
    vin: string;
    pickupDay: number;
    driverPhone: string | null;
}

export interface SyncResult {
    synced: number;
    skipped: number;
    errors: number;
}
