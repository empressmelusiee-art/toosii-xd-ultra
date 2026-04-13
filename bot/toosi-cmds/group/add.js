module.exports = {
    name: 'add',
    aliases: ['addmember','adduser'],
    description: 'Add a member to the group',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '➕', key: msg.key } }); } catch {}
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  ADD 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const num = (args[0] || '').replace(/[^0-9]/g, '');
        if (!num || num.length < 7) return sock.sendMessage(chatId, { text: `╔═|〔  ADD 〕\n║\n║ ▸ *Usage*   : ${prefix}add <phone>\n║ ▸ *Example* : ${prefix}add 254712345678\n║\n╚═╝` }, { quoted: msg });
        const jid = `${num}@s.whatsapp.net`;
        try {
            const res    = await sock.groupParticipantsUpdate(chatId, [jid], 'add');
            const status = res?.[0]?.status;
            const label  = status === '200' ? '✅ Added successfully'
                : status === '403' ? '❌ Blocked by privacy settings'
                : status === '408' ? '❌ Number not on WhatsApp'
                : status === '409' ? '⚠️ Already in group'
                : `Code: ${status}`;
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ADD 〕\n║\n║ ▸ *User*   : +${num}\n║ ▸ *Status* : ${label}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  ADD 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
