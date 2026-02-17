/**
 * Delivery Types
 *
 * Type definitions for the deliveries module
 */

export interface DeliveryRow {
    rowNumber: number;
    vin: string;
    deliveryDay: number;
    driverPhone: string | null;
}

export interface SyncResult {
    synced: number;
    skipped: number;
    errors: number;
}
