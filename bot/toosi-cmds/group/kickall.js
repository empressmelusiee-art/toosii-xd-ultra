module.exports = {
    name: 'kickall',
    aliases: ['removeall','cleargroup'],
    description: 'Kick all non-admin members from the group',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  KICK ALL 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const confirm = args[0]?.toLowerCase();
        if (confirm !== 'yes') return sock.sendMessage(chatId, {
            text: `╔═|〔  KICK ALL 〕\n║\n║ ▸ ⚠️ This will kick ALL non-admin\n║    members from the group!\n║\n║ ▸ *Confirm* : ${prefix}kickall yes\n║\n╚═╝`
        }, { quoted: msg });
        try {
            const meta     = await sock.groupMetadata(chatId);
            const botId    = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
            const members  = meta.participants.filter(p => {
                const jid = p.id || '';
                return (!p.admin) && jid !== botId;
            });
            if (!members.length) return sock.sendMessage(chatId, { text: `╔═|〔  KICK ALL 〕\n║\n║ ▸ No non-admin members to kick\n║\n╚═╝` }, { quoted: msg });
            const sent = await sock.sendMessage(chatId, { text: `╔═|〔  KICK ALL 〕\n║\n║ ▸ Kicking ${members.length} member(s)...\n║\n╚═╝` }, { quoted: msg });
            let kicked = 0;
            for (const p of members) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [p.id], 'remove');
                    kicked++;
                    await new Promise(r => setTimeout(r, 700));
                } catch {}
            }
            await sock.sendMessage(chatId, {
                text: `╔═|〔  KICK ALL 〕\n║\n║ ▸ *Kicked* : ${kicked}/${members.length}\n║ ▸ *Status* : ✅ Done\n║\n╚═╝`
            });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  KICK ALL 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
