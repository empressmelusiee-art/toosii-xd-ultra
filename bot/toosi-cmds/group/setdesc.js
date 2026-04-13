module.exports = {
    name: 'setdesc',
    aliases: ['groupdesc','setgroupdesc','description'],
    description: 'Change the group description',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  SET DESC 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const desc = args.join(' ').trim();
        if (!desc) return sock.sendMessage(chatId, { text: `╔═|〔  SET DESC 〕\n║\n║ ▸ *Usage* : ${prefix}setdesc <description>\n║\n╚═╝` }, { quoted: msg });
        try {
            await sock.groupUpdateDescription(chatId, desc);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SET DESC 〕\n║\n║ ▸ *Desc*   : ${desc.slice(0, 80)}${desc.length > 80 ? '...' : ''}\n║ ▸ *Status* : ✅ Updated\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  SET DESC 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
