module.exports = {
    name: 'leave',
    aliases: ['leavegroup','botleave'],
    description: 'Bot leaves the group',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  LEAVE 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  LEAVE 〕\n║\n║ ▸ Goodbye everyone! 👋\n║ ▸ TOOSII-XD signing off...\n║\n╚═╝`
            });
            await new Promise(r => setTimeout(r, 1500));
            await sock.groupLeave(chatId);
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  LEAVE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
