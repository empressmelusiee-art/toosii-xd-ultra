const { getTarget, resolveDisplay } = require('../../lib/groupUtils');

module.exports = {
    name: 'ban',
    aliases: ['kick','remove'],
    description: 'Remove a member from the group',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🔨', key: msg.key } }); } catch {}
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  BAN 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const target = getTarget(msg, args);
        if (!target) return sock.sendMessage(chatId, { text: `╔═|〔  BAN 〕\n║\n║ ▸ *Usage* : ${prefix}ban @user or reply a message\n║\n╚═╝` }, { quoted: msg });
        try {
            const display = await resolveDisplay(sock, chatId, target);
            await sock.groupParticipantsUpdate(chatId, [target], 'remove');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  BAN 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Status* : ✅ Removed from group\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  BAN 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
