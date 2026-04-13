const { getTarget, resolveDisplay } = require('../../lib/groupUtils');

module.exports = {
    name: 'promote',
    aliases: ['makeadmin'],
    description: 'Promote a member to admin',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '⬆️', key: msg.key } }); } catch {}
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  PROMOTE 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const target = getTarget(msg, args);
        if (!target) return sock.sendMessage(chatId, { text: `╔═|〔  PROMOTE 〕\n║\n║ ▸ *Usage* : ${prefix}promote @user or reply a message\n║\n╚═╝` }, { quoted: msg });
        try {
            const display = await resolveDisplay(sock, chatId, target);
            await sock.groupParticipantsUpdate(chatId, [target], 'promote');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  PROMOTE 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Status* : ✅ Promoted to Admin\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  PROMOTE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
