'use strict';
  const fs   = require('fs');
  const path = require('path');

  const WL_FILE = path.join(__dirname, '../../data/whitelist.json');
  function load()  { try { return JSON.parse(fs.readFileSync(WL_FILE, 'utf8')); } catch { return []; } }
  function save(d) { try { fs.mkdirSync(path.dirname(WL_FILE), { recursive: true }); fs.writeFileSync(WL_FILE, JSON.stringify(d, null, 2)); } catch {} }

  function isWhitelisted(num) {
      const clean = String(num || '').replace(/[^0-9]/g,'');
      if (!clean) return false;
      return load().some(n => String(n).replace(/[^0-9]/g,'') === clean);
  }

  module.exports = {
      isWhitelisted,
      name: 'whitelist', aliases: ['wl','allowlist'],
      description: 'Whitelist numbers to bypass private/silent mode restrictions',
      category: 'owner', ownerOnly: true, sudoAllowed: true,
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          if (!ctx?.isOwnerUser && !ctx?.isSudoUser)
              return sock.sendMessage(chatId, { text: `╔═|〔  WHITELIST 〕\n║\n║ ▸ Owner only\n║\n╚═╝` }, { quoted: msg });
          const sub = args[0]?.toLowerCase();
          const wl  = load();
          if (!sub || sub === 'list') {
              return sock.sendMessage(chatId, { text: [`╔═|〔  WHITELIST 〕`,`║`,`║ ▸ *Count* : ${wl.length}`,
                  ...(wl.length ? wl.map(n=>`║   • +${n}`) : ['`║   (empty)`']),`║`,`║ ▸ *Usage*:`,`║   ${prefix}whitelist add <number>`,`║   ${prefix}whitelist remove <number>`,`║   ${prefix}whitelist clear`,`║`,`╚═╝`].join('\n') }, { quoted: msg });
          }
          if (sub === 'add') {
              const num = (args[1]||'').replace(/[^0-9]/g,'');
              if (!num) return sock.sendMessage(chatId, { text: `╔═|〔  WHITELIST 〕\n║\n║ ▸ Provide a number\n║\n╚═╝` }, { quoted: msg });
              if (wl.includes(num)) return sock.sendMessage(chatId, { text: `╔═|〔  WHITELIST 〕\n║\n║ ▸ ⚠️ Already whitelisted\n║\n╚═╝` }, { quoted: msg });
              wl.push(num); save(wl);
              return sock.sendMessage(chatId, { text: `╔═|〔  WHITELIST 〕\n║\n║ ▸ ✅ Added: +${num}\n║\n╚═╝` }, { quoted: msg });
          }
          if (sub === 'remove' || sub === 'del') {
              const num = (args[1]||'').replace(/[^0-9]/g,'');
              const i   = wl.indexOf(num);
              if (i === -1) return sock.sendMessage(chatId, { text: `╔═|〔  WHITELIST 〕\n║\n║ ▸ ⚠️ Not found\n║\n╚═╝` }, { quoted: msg });
              wl.splice(i,1); save(wl);
              return sock.sendMessage(chatId, { text: `╔═|〔  WHITELIST 〕\n║\n║ ▸ ✅ Removed: +${num}\n║\n╚═╝` }, { quoted: msg });
          }
          if (sub === 'clear') { save([]); return sock.sendMessage(chatId, { text: `╔═|〔  WHITELIST 〕\n║\n║ ▸ ✅ Cleared\n║\n╚═╝` }, { quoted: msg }); }
      }
  };