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
                  text: `╔═|〔  RESTART 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═╝`
              }, { quoted: msg });
          }

          await sock.sendMessage(chatId, {
              text: `╔═|〔  RESTART 〕\n║\n║ ▸ *Status* : ♻️ Restarting...\n║ ▸ *Note*   : Bot will be back in ~5s\n║\n╚═╝`
          }, { quoted: msg });

          // Exit code 1 tells the launcher to restart the bot automatically
          setTimeout(() => process.exit(1), 1500);
      }
  };
  