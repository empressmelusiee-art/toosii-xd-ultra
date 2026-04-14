'use strict';

const { getBotName } = require('../../lib/botname');

module.exports = {
    name:        'leave',
    aliases:     ['leavegroup', 'botleave'],
    description: 'Bot leaves the current group (owner/sudo only)',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '👋', key: msg.key } }); } catch {}

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  LEAVE 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═╝`
            }, { quoted: msg });
        }

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  LEAVE 〕\n║\n║ ▸ *Status* : ❌ Permission denied\n║ ▸ *Reason* : Owner / sudo users only\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  LEAVE 〕\n║\n║ ▸ Goodbye everyone! 👋\n║ ▸ ${name} signing off...\n║\n╚═╝`
            });
            await new Promise(r => setTimeout(r, 1500));
            await sock.groupLeave(chatId);
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  LEAVE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
