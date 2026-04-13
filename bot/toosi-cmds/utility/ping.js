const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'ping',
    aliases: ['speed', 'latency', 'p'],
    description: 'Check bot response time',
    category: 'utility',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🏓', key: msg.key } }); } catch {}
        const name   = getBotName();

        const speed = Math.abs(Date.now() - (msg.messageTimestamp * 1000 || Date.now()));
        const bar   = speed < 300 ? '🟢 Fast' : speed < 700 ? '🟡 Medium' : '🔴 Slow';

        await sock.sendMessage(chatId, {
            text: `╔═|〔  PONG 〕\n║\n║ ▸ *Speed*    : ${speed}ms\n║ ▸ *Rating*   : ${bar}\n║ ▸ *Status*   : Online ✅\n║\n╚═|〔 ${name}  〕`,
        }, { quoted: msg });
    }
};