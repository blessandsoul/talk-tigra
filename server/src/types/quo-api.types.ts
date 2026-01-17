/**
 * Quo (OpenPhone) API Types
 * 
 * Type definitions for Quo API requests and responses
 */

/**
 * Message Direction
 */
export type MessageDirection = 'incoming' | 'outgoing';

/**
 * Message Status
 */
export type MessageStatus =
    | 'queued'
    | 'sending'
    | 'sent'
    | 'delivered'
    | 'undelivered'
    | 'failed'
    | 'received';

/**
 * Quo Message
 */
export interface QuoMessage {
    id: string;
    to: string[];
    from: string;
    text: string;
    phoneNumberId: string;
    direction: MessageDirection;
    userId: string;
    status: MessageStatus;
    createdAt: string;
    updatedAt: string;
}

/**
 * Get Messages Response
 */
export interface GetMessagesResponse {
    data: QuoMessage[];
    totalItems: number;
    nextPageToken?: string;
}

/**
 * Get Messages Query Parameters
 */
export interface GetMessagesParams {
    phoneNumberId: string;
    userId?: string;
    participants?: string[];
    maxResults?: number;
    pageToken?: string;
}

/**
 * Quo Phone Number
 */
export interface QuoPhoneNumber {
    id: string;
    groupId: string;
    portRequestId: string | null;
    formattedNumber: string;
    forward: any | null;
    name: string;
    number: string;
    portingStatus: string | null;
    symbol: string;
    users: Array<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: string;
        groupId: string;
    }>;
    createdAt: string;
    updatedAt: string;
    restrictions: {
        calling: {
            CA: string;
            Intl: string;
            US: string;
        };
        messaging: {
            CA: string;
            Intl: string;
            US: string;
        };
    };
}

/**
 * Get Phone Numbers Response
 */
export interface GetPhoneNumbersResponse {
    data: QuoPhoneNumber[];
}

/**
 * Quo Conversation
 */
export interface QuoConversation {
    id: string;
    phoneNumberId: string;
    participants: string[];
    name: string | null;
    assignedTo: string | null;
    createdAt: string;
    updatedAt: string;
    lastActivityAt: string;
    lastActivityId: string;
    deletedAt: string | null;
    mutedUntil: string | null;
    snoozedUntil: string | null;
}

/**
 * Get Conversations Response
 */
export interface GetConversationsResponse {
    data: QuoConversation[];
    totalItems: number;
    nextPageToken?: string;
}

/**
 * Get Conversations Query Parameters
 */
export interface GetConversationsParams {
    phoneNumberId?: string;
    maxResults?: number;
    pageToken?: string;
}
