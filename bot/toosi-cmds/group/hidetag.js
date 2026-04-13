module.exports = {
    name: 'hidetag',
    aliases: ['htag','silentall','stag'],
    description: 'Mention all members silently (tags hidden)',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  HIDETAG 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const text = args.join(' ').trim() || '📢 Attention everyone!';
        try {
            const meta  = await sock.groupMetadata(chatId);
            const jids  = meta.participants.map(p => p.id);
            await sock.sendMessage(chatId, {
                text,
                mentions: jids
            });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  HIDETAG 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
