module.exports = {
    name: 'setgpp',
    aliases: ['setpp','seticon','grouppic','setgrouppp','setgroupicon','setpic'],
    description: 'Change the group profile picture',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  SET PP 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const meta      = await sock.groupMetadata(chatId);
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const senderNum = senderJid.split('@')[0].split(':')[0];
        const isAdmin   = meta.participants.some(p => {
            const pNum = (p.id || p.phoneNumber || '').split('@')[0].split(':')[0];
            return pNum === senderNum && (p.admin === 'admin' || p.admin === 'superadmin');
        });
        const isOwner   = ctx?.isOwner?.() || ctx?.isSudoUser || false;
        if (!isAdmin && !isOwner) return sock.sendMessage(chatId, { text: `╔═|〔  SET PP 〕\n║\n║ ▸ *Status* : ❌ Admins only\n║\n╚═╝` }, { quoted: msg });
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imgMsg = quoted?.imageMessage || msg.message?.imageMessage;
        if (!imgMsg) return sock.sendMessage(chatId, { text: `╔═|〔  SET PP 〕\n║\n║ ▸ *Usage* : Reply an image with ${prefix}setgpp\n║\n╚═╝` }, { quoted: msg });
        try {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const buf = await downloadMediaMessage(
                { message: quoted ? quoted : msg.message, key: msg.key },
                'buffer', {}
            );
            await sock.updateProfilePicture(chatId, buf);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SET PP 〕\n║\n║ ▸ *Status* : ✅ Group photo updated\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  SET PP 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
