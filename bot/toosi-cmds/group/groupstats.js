'use strict';
  const fs   = require('fs');
  const path = require('path');

  const CFG_FILE = path.join(__dirname, '../../data/groupstats.json');
  function loadStats()  { try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return {}; } }
  function saveStats(d) { try { fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true }); fs.writeFileSync(CFG_FILE, JSON.stringify(d, null, 2)); } catch {} }

  const _gsReg = new WeakSet();
  function setupGroupStatsListener(sock) {
      if (_gsReg.has(sock)) return;
      _gsReg.add(sock);
      const startedAt = Math.floor(Date.now() / 1000);
      sock.ev.on('messages.upsert', async ({ messages }) => {
          for (const msg of messages) {
              if (!msg.message || msg.key.fromMe) continue;
              const ts = Number(msg.messageTimestamp || 0);
              if (ts && ts < startedAt - 5) continue;
              const chatId = msg.key.remoteJid;
              if (!chatId?.endsWith('@g.us')) continue;
              const sender = (msg.key.participant || '').split('@')[0].split(':')[0];
              if (!sender) continue;
              const stats = loadStats();
              if (!stats[chatId]) stats[chatId] = {};
              stats[chatId][sender] = (stats[chatId][sender] || 0) + 1;
              saveStats(stats);
          }
      });
  }

  module.exports = {
      setupGroupStatsListener,
      name: 'groupstats', aliases: ['gstats','leaderboard','msgcount'],
      description: 'Show message count leaderboard for this group',
      category: 'group',
      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          if (!chatId?.endsWith('@g.us'))
              return sock.sendMessage(chatId, { text: `╔═|〔  GROUP STATS 〕\n║\n║ ▸ Groups only\n║\n╚═╝` }, { quoted: msg });
          try { await sock.sendMessage(chatId, { react: { text: '📊', key: msg.key } }); } catch {}
          const sub = args[0]?.toLowerCase();
          const stats = loadStats();
          const gs    = stats[chatId] || {};
          if (sub === 'reset') {
              if (!ctx?.isOwnerUser && !ctx?.isSudoUser && !ctx?.isGroupAdmin)
                  return sock.sendMessage(chatId, { text: `╔═|〔  GROUP STATS 〕\n║\n║ ▸ Admins only\n║\n╚═╝` }, { quoted: msg });
              stats[chatId] = {}; saveStats(stats);
              return sock.sendMessage(chatId, { text: `╔═|〔  GROUP STATS 〕\n║\n║ ▸ ✅ Stats reset\n║\n╚═╝` }, { quoted: msg });
          }
          const sorted = Object.entries(gs).sort((a,b) => b[1]-a[1]).slice(0,10);
          if (!sorted.length)
              return sock.sendMessage(chatId, { text: `╔═|〔  GROUP STATS 〕\n║\n║ ▸ No data yet — send messages first\n║\n╚═╝` }, { quoted: msg });
          const medals = ['🥇','🥈','🥉'];
          const rows   = sorted.map(([num, cnt], i) => `║ ${medals[i]||i+1+'.'} *+${num}* : ${cnt} msgs`);
          const total  = Object.values(gs).reduce((a,b)=>a+b,0);
          return sock.sendMessage(chatId, { text: [`╔═|〔  GROUP STATS 〕`,`║`,`║ ▸ *Top ${sorted.length} members*`,`║ ▸ *Total* : ${total} msgs`,`║`,...rows,`║`,`║ ▸ ${prefix}groupstats reset — clear`,`║`,`╚═╝`].join('\n') }, { quoted: msg });
      }
  };