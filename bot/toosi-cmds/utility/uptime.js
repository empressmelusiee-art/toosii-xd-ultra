module.exports = {
      name: 'uptime',
      aliases: ['up', 'runtime'],
      description: 'Show how long the bot has been running',
      category: 'utility',
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          try { await sock.sendMessage(chatId, { react: { text: '⏱️', key: msg.key } }); } catch {}
          const t = process.uptime();
          const d = Math.floor(t / 86400);
          const h = Math.floor((t % 86400) / 3600);
          const m = Math.floor((t % 3600) / 60);
          const s = Math.floor(t % 60);
          const parts = [];
          if (d) parts.push(d + 'd');
          if (h) parts.push(h + 'h');
          if (m) parts.push(m + 'm');
          parts.push(s + 's');
          await sock.sendMessage(chatId, {
            text: `╔═|〔  UPTIME 〕\n║\n║ ▸ *Runtime* : ${parts.join(' ')}\n║\n╚═╝`
        }, { quoted: msg });
      }
  };