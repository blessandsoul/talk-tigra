/**
 * Reset lastParsedAt for testing
 * 
 * Run this script to reset all conversations so they get re-parsed by n8n
 */

import { prisma } from './src/libs/db.js';

async function resetParsedConversations() {
    try {
        // Option 1: Reset ALL conversations
        const result = await prisma.conversation.updateMany({
            data: {
                lastParsedAt: null,
            },
        });

        console.log(`✅ Reset ${result.count} conversations`);

        // Option 2: Reset only specific phone number
        // const conversations = await prisma.conversation.findMany();
        // let resetCount = 0;

        // for (const conv of conversations) {
        //     const participants = JSON.parse(conv.participants);
        //     if (participants.includes('19125920562')) {
        //         await prisma.conversation.update({
        //             where: { id: conv.id },
        //             data: { lastParsedAt: null },
        //         });
        //         resetCount++;
        //     }
        // }

        // console.log(`✅ Reset ${resetCount} conversations for phone 19125920562`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetParsedConversations();
