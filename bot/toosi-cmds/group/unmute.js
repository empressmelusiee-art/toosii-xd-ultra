'use strict';

const { getBotName } = require('../../lib/botname');

module.exports = {
    name:        'unmute',
    aliases:     ['open', 'unlock', 'unlockgroup', 'unmutegrp'],
    description: 'Unmute the group — all members can send messages (sudo/admin only)',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '🔊', key: msg.key } }); } catch {}

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  🔊 UNMUTE 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const meta       = await sock.groupMetadata(chatId);
            const senderJid  = msg.key.participant || msg.key.remoteJid;
            const senderNum  = senderJid.split('@')[0].split(':')[0];

            const botJid     = sock.user?.id || '';
            const botNum     = botJid.split('@')[0].split(':')[0];

            const senderPart = meta.participants.find(p => {
                const pNum = (p.id || '').split('@')[0].split(':')[0];
                return pNum === senderNum || p.id === senderJid;
            });
            const botPart    = meta.participants.find(p => {
                const pNum = (p.id || '').split('@')[0].split(':')[0];
                return pNum === botNum;
            });

            const isSenderAdmin = senderPart?.admin === 'admin' || senderPart?.admin === 'superadmin';
            const isBotAdmin    = botPart?.admin    === 'admin' || botPart?.admin    === 'superadmin';
            const isPrivileged  = ctx?.isOwnerUser || ctx?.isSudoUser || isSenderAdmin;

            if (!isPrivileged) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  🔊 UNMUTE 〕\n║\n║ ▸ *Status* : ❌ Permission denied\n║ ▸ *Reason* : Sudo users and group admins only\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            if (!isBotAdmin) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  🔊 UNMUTE 〕\n║\n║ ▸ *Status* : ❌ Bot is not an admin\n║ ▸ *Reason* : Promote the bot first\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            await sock.groupSettingUpdate(chatId, 'not_announcement');

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  🔊 UNMUTE 〕`,
                    `║`,
                    `║ ▸ *Group*  : ${meta.subject}`,
                    `║ ▸ *Status* : 🔊 Group unmuted`,
                    `║ ▸ *Effect* : All members can now send messages`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🔊 UNMUTE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
