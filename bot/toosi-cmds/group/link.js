module.exports = {
    name: 'glink',
    aliases: ['grouplink','invitelink'],
    description: 'Get group invite link',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🔗', key: msg.key } }); } catch {}
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  LINK 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        try {
            const code = await sock.groupInviteCode(chatId);
            const link = `https://chat.whatsapp.com/${code}`;
            await sock.sendMessage(chatId, { text: `╔═|〔  GROUP LINK 〕\n║\n║ ▸ *Link* : ${link}\n║\n╚═╝` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  LINK 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
