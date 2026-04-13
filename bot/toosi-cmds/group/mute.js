module.exports = {
    name: 'mute',
    aliases: ['close','lock'],
    description: 'Mute group — only admins can send messages',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🔇', key: msg.key } }); } catch {}
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  MUTE 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        try {
            await sock.groupSettingUpdate(chatId, 'announcement');
            await sock.sendMessage(chatId, { text: `╔═|〔  MUTE 〕\n║\n║ ▸ *Status* : 🔇 Group muted\n║ ▸ Only admins can now send messages\n║\n╚═╝` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  MUTE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
