module.exports = {
    name: 'setname',
    aliases: ['groupname','setgroupname','rename'],
    description: 'Change the group name/subject',
    category: 'group',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  SET NAME 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
        const name = args.join(' ').trim();
        if (!name) return sock.sendMessage(chatId, { text: `╔═|〔  SET NAME 〕\n║\n║ ▸ *Usage* : ${prefix}setname <new name>\n║\n╚═╝` }, { quoted: msg });
        try {
            await sock.groupUpdateSubject(chatId, name);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  SET NAME 〕\n║\n║ ▸ *New Name* : ${name}\n║ ▸ *Status*   : ✅ Updated\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, { text: `╔═|〔  SET NAME 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝` }, { quoted: msg });
        }
    }
};
