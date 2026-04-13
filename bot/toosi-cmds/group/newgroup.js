'use strict';
// ─────────────────────────────────────────────────────────────
//  New Group — create a WhatsApp group via the bot
// ─────────────────────────────────────────────────────────────

module.exports = {
    name: 'newgroup',
    aliases: ['creategroup', 'makegroup', 'mkgroup'],
    description: 'Create a new WhatsApp group with mentioned members',
    category: 'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '👥', key: msg.key } }); } catch {}

        const groupName = args.join(' ').replace(/@\d+/g, '').trim();
        if (!groupName) return sock.sendMessage(chatId, {
            text: `╔═|〔  NEW GROUP 〕\n║\n║ ▸ *Usage* : ${prefix}newgroup <name> @members\n║ ▸ Example : ${prefix}newgroup Study Group @member1 @member2\n║\n╚═╝`,
        }, { quoted: msg });

        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) return sock.sendMessage(chatId, {
            text: `╔═|〔  NEW GROUP 〕\n║\n║ ▸ Mention at least one member\n║ ▸ *Usage* : ${prefix}newgroup <name> @member\n║\n╚═╝`,
        }, { quoted: msg });

        const sender   = msg.key.participant || msg.key.remoteJid;
        // Include sender + mentioned members
        const members  = [...new Set([sender, ...mentioned])];

        try {
            const result = await sock.groupCreate(groupName, members);
            const gid    = result.id;
            const link   = await sock.groupInviteCode(gid).then(c => `https://chat.whatsapp.com/${c}`).catch(() => 'N/A');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  NEW GROUP 〕\n║\n║ ▸ ✅ Group created!\n║\n║ ▸ *Name* : ${groupName}\n║ ▸ *Members* : ${members.length}\n║ ▸ *Link* : ${link}\n║\n╚═╝`,
            }, { quoted: msg });

            // Send a welcome message in the new group
            try {
                await sock.sendMessage(gid, {
                    text: `👋 Welcome to *${groupName}*!\n\nThis group was created by the bot.\n\n${link}`,
                });
            } catch {}
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  NEW GROUP 〕\n║\n║ ▸ ❌ Failed to create group\n║ ▸ ${e.message || e}\n║\n╚═╝`,
            }, { quoted: msg });
        }
    }
};
