const { getTarget, resolveDisplay } = require('../../lib/groupUtils');

module.exports = {
    name: 'demote',
    aliases: ['unadmin','removeadmin'],
    description: 'Demote an admin to member',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '⬇️', key: msg.key } }); } catch {}
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  DEMOTE 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const target = getTarget(msg, args);
        if (!target) return sock.sendMessage(chatId, { text: `╔═|〔  DEMOTE 〕\n║\n║ ▸ *Usage* : ${prefix}demote @user or reply a message\n║\n╚═╝` }, { quoted: msg });
        try {
            const display = await resolveDisplay(sock, chatId, target);
            await sock.groupParticipantsUpdate(chatId, [target], 'demote');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  DEMOTE 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Status* : ✅ Demoted to Member\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  DEMOTE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
