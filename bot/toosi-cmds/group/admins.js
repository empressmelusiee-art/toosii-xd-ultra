const { resolveDisplayWithName } = require('../../lib/groupUtils');

module.exports = {
    name: 'admins',
    aliases: ['listadmins', 'groupadmins', 'admin'],
    description: 'List all group admins',
    category: 'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '👑', key: msg.key } }); } catch {}
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: `╔═|〔  ADMINS 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        }
        try {
            const meta   = await sock.groupMetadata(chatId);
            const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            if (!admins.length) {
                return sock.sendMessage(chatId, { text: `╔═|〔  ADMINS 〕\n║\n║ ▸ No admins found\n║\n╚═╝` }, { quoted: msg });
            }

            // Resolve each admin — phone number + saved name (if any)
            const lines = await Promise.all(admins.map(async (p) => {
                const crown   = p.admin === 'superadmin' ? '👑' : '⭐';
                const display = await resolveDisplayWithName(sock, chatId, p.id || '', p.notify || null);
                return `║  ${crown} ${display}`;
            }));

            await sock.sendMessage(chatId, {
                text: `╔═|〔  ADMINS 〕\n║\n║ ▸ *Group* : ${meta.subject}\n║ ▸ *Count* : ${admins.length}\n║\n${lines.join('\n')}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ADMINS 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
