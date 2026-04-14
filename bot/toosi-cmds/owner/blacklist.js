'use strict';
  const fs   = require('fs');
  const path = require('path');

  const BL_FILE = path.join(__dirname, '../../data/blacklist.json');
  function load()  { try { return JSON.parse(fs.readFileSync(BL_FILE, 'utf8')); } catch { return []; } }
  function save(d) { try { fs.mkdirSync(path.dirname(BL_FILE), { recursive: true }); fs.writeFileSync(BL_FILE, JSON.stringify(d, null, 2)); } catch {} }

  function isBlacklisted(num) {
      const clean = String(num || '').replace(/[^0-9]/g,'');
      if (!clean) return false;
      return load().some(n => String(n).replace(/[^0-9]/g,'') === clean);
  }

  module.exports = {
      isBlacklisted,
      name: 'blacklist', aliases: ['bl','banuser','blockuser'],
      description: 'Blacklist numbers — blocked users cannot use any bot commands',
      category: 'owner', ownerOnly: true, sudoAllowed: true,
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          if (!ctx?.isOwnerUser && !ctx?.isSudoUser)
              return sock.sendMessage(chatId, { text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ Owner only\n║\n╚═╝` }, { quoted: msg });
          const sub = args[0]?.toLowerCase();
          const bl  = load();
          if (!sub || sub === 'list') {
              return sock.sendMessage(chatId, { text: [`╔═|〔  BLACKLIST 〕`,`║`,`║ ▸ *Count* : ${bl.length}`,
                  ...(bl.length ? bl.map(n=>`║   • +${n}`) : ['`║   (empty)`']),`║`,`║ ▸ *Usage*:`,`║   ${prefix}blacklist add <number>`,`║   ${prefix}blacklist remove <number>`,`║   ${prefix}blacklist clear`,`║`,`╚═╝`].join('\n') }, { quoted: msg });
          }
          if (sub === 'add') {
              const num = (args[1]||'').replace(/[^0-9]/g,'');
              if (!num) return sock.sendMessage(chatId, { text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ Provide a number\n║\n╚═╝` }, { quoted: msg });
              if (bl.includes(num)) return sock.sendMessage(chatId, { text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ⚠️ Already blacklisted\n║\n╚═╝` }, { quoted: msg });
              bl.push(num); save(bl);
              return sock.sendMessage(chatId, { text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ 🚫 Blocked: +${num}\n║\n╚═╝` }, { quoted: msg });
          }
          if (sub === 'remove' || sub === 'del') {
              const num = (args[1]||'').replace(/[^0-9]/g,'');
              const i   = bl.indexOf(num);
              if (i === -1) return sock.sendMessage(chatId, { text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ⚠️ Not found\n║\n╚═╝` }, { quoted: msg });
              bl.splice(i,1); save(bl);
              return sock.sendMessage(chatId, { text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ✅ Unblocked: +${num}\n║\n╚═╝` }, { quoted: msg });
          }
          if (sub === 'clear') { save([]); return sock.sendMessage(chatId, { text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ✅ Cleared\n║\n╚═╝` }, { quoted: msg }); }
      }
  };