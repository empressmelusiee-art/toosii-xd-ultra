'use strict';

const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'restart',
    aliases: ['reboot', 'reloadbot'],
    description: 'Restart the bot process (owner only)',
    category: 'owner',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!ctx.isOwner()) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  RESTART 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, {
            text: `╔═|〔  RESTART 〕\n║\n║ ▸ *Status* : ♻️ Restarting...\n║ ▸ *Note*   : Bot will be back in ~10s\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });

        // Small delay so the confirmation message can be sent before exit
        setTimeout(() => process.exit(0), 1500);
    }
};
