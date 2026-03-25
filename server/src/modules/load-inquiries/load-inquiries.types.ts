/**
 * Load Inquiry Types
 *
 * Types for tracking which drivers texted about which loads
 */

export interface LoadInquiryRecord {
    id: string;
    loadId: string;
    vin: string | null;
    vehicleInfo: string | null;
    receivedIn: string | null;
    phoneNumber: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
    mentionCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoadInquiryStatsItem {
    loadId: string;
    vin: string | null;
    vehicleInfo: string | null;
    receivedIn: string | null;
    driverCount: number;
    totalMentions: number;
    latestInquiry: Date;
}
