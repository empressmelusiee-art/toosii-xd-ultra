'use strict';
  const fs   = require('fs');
  const path = require('path');

  const BL_FILE = path.join(__dirname, '../../data/blacklist.json');
  function load()  { try { return JSON.parse(fs.readFileSync(BL_FILE, 'utf8')); } catch { return []; } }
  function save(d) { try { fs.mkdirSync(path.dirname(BL_FILE), { recursive: true }); fs.writeFileSync(BL_FILE, JSON.stringify(d, null, 2)); } catch {} }

  function normalize(num) { return String(num || '').replace(/[^0-9]/g, ''); }

  function isBlacklisted(num) {
      const clean = normalize(num);
      if (!clean) return false;
      return load().some(n => normalize(n) === clean);
  }

  // Extract number from args OR from a quoted/mentioned message
  function resolveNumber(msg, args) {
      // 1. Direct number in args
      const fromArgs = normalize(args[0] || '');
      if (fromArgs) return fromArgs;

      // 2. @mentioned JID in the message
      const ctx   = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = (ctx?.mentionedJid || [])[0];
      if (mentioned) return normalize(mentioned.split('@')[0].split(':')[0]);

      // 3. Quoted message sender
      if (ctx?.participant) return normalize(ctx.participant.split('@')[0].split(':')[0]);

      return null;
  }

  module.exports = {
      isBlacklisted,
      name: 'blacklist', aliases: ['bl', 'banuser', 'blockuser'],
      description: 'Blacklist numbers — blocked users cannot use any bot commands',
      category: 'owner', ownerOnly: true, sudoAllowed: true,

      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;

          if (!ctx?.isOwnerUser && !ctx?.isSudoUser)
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ❌ Owner/sudo only\n║\n╚═╝`
              }, { quoted: msg });

          const sub = (args[0] || '').toLowerCase();
          const bl  = load();

          // ── list ─────────────────────────────────────────────────────────────
          if (!sub || sub === 'list') {
              const rows = bl.length
                  ? bl.map((n, i) => `║   ${i + 1}. +${n}`).join('\n')
                  : '║   (empty)';
              return sock.sendMessage(chatId, {
                  text: [
                      `╔═|〔  BLACKLIST 〕`, `║`,
                      `║ ▸ *Blocked* : ${bl.length} number(s)`, `║`,
                      rows, `║`,
                      `║ ▸ *Usage*:`,
                      `║   ${prefix}blacklist add <number | @mention | reply>`,
                      `║   ${prefix}blacklist remove <number>`,
                      `║   ${prefix}blacklist check <number>`,
                      `║   ${prefix}blacklist clear`,
                      `║`, `╚═╝`
                  ].join('\n')
              }, { quoted: msg });
          }

          // ── add ───────────────────────────────────────────────────────────────
          if (sub === 'add') {
              const num = resolveNumber(msg, args.slice(1));
              if (!num)
                  return sock.sendMessage(chatId, {
                      text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ❌ Provide a number, @mention, or reply to a message\n║\n╚═╝`
                  }, { quoted: msg });
              if (bl.some(n => normalize(n) === num))
                  return sock.sendMessage(chatId, {
                      text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ⚠️ Already blacklisted: +${num}\n║\n╚═╝`
                  }, { quoted: msg });
              bl.push(num); save(bl);
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ 🚫 Blocked : +${num}\n║ ▸ *Total*   : ${bl.length}\n║\n╚═╝`
              }, { quoted: msg });
          }

          // ── remove / del ──────────────────────────────────────────────────────
          if (sub === 'remove' || sub === 'del') {
              const num = resolveNumber(msg, args.slice(1));
              if (!num)
                  return sock.sendMessage(chatId, {
                      text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ❌ Provide a number, @mention, or reply\n║\n╚═╝`
                  }, { quoted: msg });
              const idx = bl.findIndex(n => normalize(n) === num);
              if (idx === -1)
                  return sock.sendMessage(chatId, {
                      text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ⚠️ Not found: +${num}\n║\n╚═╝`
                  }, { quoted: msg });
              bl.splice(idx, 1); save(bl);
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ✅ Unblocked : +${num}\n║ ▸ *Total*     : ${bl.length}\n║\n╚═╝`
              }, { quoted: msg });
          }

          // ── check ─────────────────────────────────────────────────────────────
          if (sub === 'check') {
              const num = resolveNumber(msg, args.slice(1));
              if (!num)
                  return sock.sendMessage(chatId, {
                      text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ❌ Provide a number\n║\n╚═╝`
                  }, { quoted: msg });
              const blocked = bl.some(n => normalize(n) === num);
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ *Number* : +${num}\n║ ▸ *Status* : ${blocked ? '🚫 Blacklisted' : '✅ Not blacklisted'}\n║\n╚═╝`
              }, { quoted: msg });
          }

          // ── clear ─────────────────────────────────────────────────────────────
          if (sub === 'clear') {
              save([]);
              return sock.sendMessage(chatId, {
                  text: `╔═|〔  BLACKLIST 〕\n║\n║ ▸ ✅ All ${bl.length} number(s) cleared\n║\n╚═╝`
              }, { quoted: msg });
          }

          // ── unknown subcommand ────────────────────────────────────────────────
          return sock.sendMessage(chatId, {
              text: [
                  `╔═|〔  BLACKLIST 〕`, `║`,
                  `║ ▸ Unknown: "${sub}"`, `║`,
                  `║ ▸ *Subcommands*:`,
                  `║   list | add | remove | check | clear`,
                  `║`, `╚═╝`
              ].join('\n')
          }, { quoted: msg });
      }
  };