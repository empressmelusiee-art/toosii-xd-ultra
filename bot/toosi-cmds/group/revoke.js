module.exports = {
    name: 'revoke',
    aliases: ['resetlink','newlink'],
    description: 'Revoke and reset the group invite link',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  REVOKE 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        try {
            const code = await sock.groupRevokeInvite(chatId);
            const link = `https://chat.whatsapp.com/${code}`;
            await sock.sendMessage(chatId, { text: `╔═|〔  REVOKE LINK 〕\n║\n║ ▸ Old link revoked ✅\n║ ▸ *New Link* : ${link}\n║\n╚═╝` }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  REVOKE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
