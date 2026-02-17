/**
 * Stop Command Extractor
 *
 * Detects /STOP opt-out commands in inbound conversation messages.
 * When a driver sends "/STOP", they should be marked with "x" in their
 * notes field so they no longer receive automated dispatch suggestions.
 *
 * Only checks INCOMING messages (direction === 'incoming').
 */

import logger from './logger.js';

interface ConversationMessage {
    direction: string;
    text?: string;
    from?: string;
    timestamp?: Date | string;
}

const STOP_PATTERN = /^\/STOP$/i;

/**
 * Check if a single message text is a /STOP opt-out command
 *
 * @param text - Raw message text
 * @returns true if the text is a /STOP command
 */
export function isStopMessage(text: string): boolean {
    return STOP_PATTERN.test(text.trim());
}

/**
 * Check if any incoming message in the conversation contains the /STOP command
 *
 * @param messages - Array of conversation messages (chronological order)
 * @returns true if an incoming /STOP command is found
 */
export function hasStopCommand(messages: ConversationMessage[]): boolean {
    for (const msg of messages) {
        if (msg.direction !== 'incoming') continue;

        if (isStopMessage(msg.text || '')) {
            logger.info(
                { from: msg.from, timestamp: msg.timestamp },
                '[STOP COMMAND] Detected /STOP opt-out command from driver'
            );
            return true;
        }
    }

    return false;
}
