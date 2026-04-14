'use strict';
  const fs   = require('fs');
  const path = require('path');

  const CFG_FILE = path.join(__dirname, '../../data/autoreply.json');
  function loadCfg()  { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return {}; } }
  function saveCfg(d) { try { fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true }); fs.writeFileSync(CFG_FILE, JSON.stringify(d, null, 2)); } catch {} }
  function defaultG() { return { enabled: false, triggers: {} }; }

  // Reset all groups to OFF on every bot startup
  try {
      const _b = loadCfg(); let _c = false;
      for (const id of Object.keys(_b)) { if (_b[id]?.enabled) { _b[id].enabled = false; _c = true; } }
      if (_c) saveCfg(_b);
  } catch {}

  const _arReg = new WeakSet();
  function setupAutoReplyListener(sock) {
      if (_arReg.has(sock)) return;
      _arReg.add(sock);
      const startedAt = Math.floor(Date.now() / 1000);
      sock.ev.on('messages.upsert', async ({ messages }) => {
          for (const msg of messages) {
              if (!msg.message || msg.key.fromMe) continue;
              const ts = Number(msg.messageTimestamp || 0);
              if (ts && ts < startedAt - 5) continue;
              const chatId = msg.key.remoteJid;
              const gcfg = loadCfg()[chatId];
              if (!gcfg?.enabled || !Object.keys(gcfg.triggers || {}).length) continue;
              const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').toLowerCase().trim();
              if (!text) continue;
              for (const [kw, reply] of Object.entries(gcfg.triggers)) {
                  if (text.includes(kw.toLowerCase())) {
                      await sock.sendMessage(chatId, { text: reply }, { quoted: msg });
                      break;
                  }
              }
          }
      });
  }

  module.exports = {
      setupAutoReplyListener,
      name: 'autoreply', aliases: ['ar','autoresponse'],
      description: 'Set keyword-triggered auto-replies per group',
      category: 'group',
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          if (!ctx?.isOwnerUser && !ctx?.isSudoUser && !ctx?.isGroupAdmin)
              return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ Admins/Owner only\n║\n╚═╝` }, { quoted: msg });
          const cfg  = loadCfg();
          const gcfg = Object.assign(defaultG(), cfg[chatId] || {});
          const save = () => { cfg[chatId] = gcfg; saveCfg(cfg); };
          const sub  = args[0]?.toLowerCase();
          if (!sub || sub === 'status') {
              const count = Object.keys(gcfg.triggers).length;
              return sock.sendMessage(chatId, { text: [`╔═|〔  AUTO REPLY 〕`,`║`,`║ ▸ *State*    : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}`,`║ ▸ *Triggers* : ${count}`,`║`,`║ ▸ *Usage*:`,`║   ${prefix}autoreply on/off`,`║   ${prefix}autoreply add <keyword> | <reply>`,`║   ${prefix}autoreply remove <keyword>`,`║   ${prefix}autoreply list`,`║   ${prefix}autoreply clear`,`║`,`╚═╝`].join('\n') }, { quoted: msg });
          }
          if (sub === 'on' ) { gcfg.enabled = true;  save(); return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ *State* : ✅ Enabled\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'off') { gcfg.enabled = false; save(); return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ *State* : ❌ Disabled\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'list') {
              const entries = Object.entries(gcfg.triggers);
              const rows = entries.length ? entries.map(([k,v]) => `║   • *${k}* → ${v.length>40?v.slice(0,40)+'…':v}`).join('\n') : '║   none';
              return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ *Triggers* (${entries.length}):\n${rows}\n║\n╚═╝` }, { quoted: msg });
          }
          if (sub === 'clear') { gcfg.triggers = {}; save(); return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ ✅ All triggers cleared\n║\n╚═╝` }, { quoted: msg }); }
          if (sub === 'add') {
              const rest  = args.slice(1).join(' ');
              const split = rest.split('|');
              if (split.length < 2) return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ Usage: ${prefix}autoreply add <keyword> | <reply>\n║\n╚═╝` }, { quoted: msg });
              const kw    = split[0].trim().toLowerCase();
              const reply = split.slice(1).join('|').trim();
              if (!kw || !reply) return;
              gcfg.triggers[kw] = reply; save();
              return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ ✅ Added\n║ ▸ *Keyword* : ${kw}\n║ ▸ *Reply*   : ${reply.slice(0,40)}\n║\n╚═╝` }, { quoted: msg });
          }
          if (sub === 'remove' || sub === 'del') {
              const kw = args.slice(1).join(' ').toLowerCase().trim();
              if (!gcfg.triggers[kw]) return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ ⚠️ Not found: "${kw}"\n║\n╚═╝` }, { quoted: msg });
              delete gcfg.triggers[kw]; save();
              return sock.sendMessage(chatId, { text: `╔═|〔  AUTO REPLY 〕\n║\n║ ▸ ✅ Removed: "${kw}"\n║\n╚═╝` }, { quoted: msg });
          }
      }
  };