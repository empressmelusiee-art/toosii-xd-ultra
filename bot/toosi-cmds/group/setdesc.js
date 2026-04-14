'use strict';

const { checkPrivilege } = require('../../lib/groupUtils');
const { getBotName }     = require('../../lib/botname');

module.exports = {
    name:        'setdesc',
    aliases:     ['groupdesc', 'setgroupdesc', 'description'],
    description: 'Change the group description (sudo/admin only)',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📝', key: msg.key } }); } catch {}

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  SET DESC 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const { ok } = await checkPrivilege(sock, chatId, msg, ctx);
        if (!ok) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  SET DESC 〕\n║\n║ ▸ *Status* : ❌ Permission denied\n║ ▸ *Reason* : Sudo users and group admins only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const desc = args.join(' ').trim();
        if (!desc) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  SET DESC 〕\n║\n║ ▸ *Usage* : ${prefix}setdesc <description>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            await sock.groupUpdateDescription(chatId, desc);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SET DESC 〕\n║\n║ ▸ *Desc*   : ${desc.slice(0, 80)}${desc.length > 80 ? '...' : ''}\n║ ▸ *Status* : ✅ Updated\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SET DESC 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
