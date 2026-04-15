'use strict';
  const path = require('path');

  // ── Coin list ─────────────────────────────────────────────────────────────────
  const COINS = ['bitcoin','btc','ethereum','eth','bnb','binancecoin','solana','sol',
      'dogecoin','doge','xrp','ripple','cardano','ada','shiba','shib','matic','polygon',
      'litecoin','ltc','pepe','ton','tron','trx','near','avalanche','avax','polkadot',
      'dot','chainlink','link','uni','uniswap','atom','cosmos','inj','sui','apt','aptos'];

  // ── Detect intent from plain text ─────────────────────────────────────────────
  function detectIntent(text) {
      const t = text.toLowerCase().trim();

      // Play / song
      if (/\b(play|playsong|download\s+song|download\s+music|play\s+song|play\s+music|sing)\b/.test(t)) {
          const query = text.replace(/^[\s\S]*?(play\s+song|play\s+music|download\s+song|download\s+music|playsong|play|sing)\s+/i, '').trim();
          return { intent: 'play', args: query.split(' ').filter(Boolean) };
      }

      // Download video
      if (/\b(download\s+video|yt\s+video|youtube\s+video|video\s+download)\b/.test(t)) {
          const query = text.replace(/download\s+video|yt\s+video|youtube\s+video|video\s+download/gi, '').trim();
          return { intent: 'youtube', args: query.split(' ').filter(Boolean) };
      }

      // Weather
      if (/\b(weather|forecast|clima)\b/.test(t)) {
          const m = text.match(/(?:weather|forecast|clima)\s+(?:in|for|at|of)?\s*(.+)/i);
          const city = m ? m[1].replace(/[?.!,]/g,'').trim() : text.replace(/weather|forecast|clima|what|is|the|check/gi,'').trim();
          return { intent: 'weather', args: city.split(' ').filter(Boolean) };
      }

      // Crypto
      if (/\b(crypto|coin|price\s+of|coin\s+price)\b/.test(t) || COINS.some(c => new RegExp('\\b'+c+'\\b').test(t))) {
          const found = COINS.find(c => new RegExp('\\b'+c+'\\b').test(t));
          const query = found || text.replace(/price|of|crypto|coin|the|what|is|check|current/gi,'').trim();
          return { intent: 'crypto', args: query.split(' ').filter(Boolean) };
      }

      // Translate
      if (/\b(translate|translation)\b/.test(t)) {
          const langMatch = t.match(/\bto\s+(english|french|spanish|arabic|swahili|german|portuguese|chinese|japanese|korean|hindi|russian|italian|turkish)\b/i);
          const lang = langMatch ? langMatch[1] : 'english';
          const textToTrans = text.replace(/translate|translation|to\s+\w+/gi,'').trim();
          return { intent: 'translate', args: [lang, ...textToTrans.split(' ').filter(Boolean)] };
      }

      // Calculate
      if (/\b(calculate|calc|compute|solve|math)\b/.test(t)) {
          const expr = text.replace(/calculate|calc|compute|solve|math|what\s+is|what's|please/gi,'').trim();
          return { intent: 'calc', args: [expr] };
      }

      // Recipe
      if (/\b(recipe|how\s+to\s+(make|cook|prepare|bake)|cook\s+|bake\s+)/.test(t)) {
          const dish = text.replace(/recipe|how\s+to|make|cook|prepare|bake|for|a\s+|an\s+|the\s+/gi,'').trim();
          return { intent: 'recipe', args: dish.split(' ').filter(Boolean) };
      }

      // News
      if (/\b(news|headlines|latest\s+news|breaking\s+news)\b/.test(t)) {
          const topic = text.replace(/news|headlines|latest|breaking|show|me|get|the|about/gi,'').trim();
          return { intent: 'news', args: topic ? topic.split(' ').filter(Boolean) : [] };
      }

      // Wiki / define / who is / what is
      if (/\b(who\s+is|what\s+is|tell\s+me\s+about|explain|define|wiki|wikipedia)\b/.test(t)) {
          const topic = text.replace(/who\s+is|what\s+is|tell\s+me\s+about|explain|define|wiki|wikipedia|please/gi,'').trim();
          return { intent: 'wiki', args: topic.split(' ').filter(Boolean) };
      }

      return null;
  }

  // ── Load command (handles array exports) ──────────────────────────────────────
  function loadCmd(relPath) {
      const mod = require(relPath);
      return Array.isArray(mod) ? mod[0] : mod;
  }

  // ── Execute a detected intent ─────────────────────────────────────────────────
  // Returns true if handled, false if should fall through to chatbot
  async function runIntent(sock, msg, detected, prefix, ctx) {
      if (!detected || !detected.args.length) return false;

      switch (detected.intent) {
          case 'play':
              return !!(await loadCmd(path.join(__dirname, '../toosi-cmds/download/play.js'))
                  .execute(sock, msg, detected.args, prefix, ctx).catch(() => null));

          case 'youtube': {
              try {
                  const { casperGet, dlBuffer } = require('./keithapi');
                  const vQuery = detected.args.join(' ').trim();
                  const search = await casperGet('/api/search/youtube', { query: vQuery });
                  if (!search.success || !search.videos?.length) return false;
                  const top = search.videos[0];
                  const dl  = await casperGet('/api/downloader/ytmp4', { url: top.url, quality: '720' });
                  if (!dl?.success || !dl?.url) return false;
                  const buf = await dlBuffer(dl.url);
                  const banner = [
                      `╔═|〔  🎬 VIDEO 〕`, `║`,
                      `║ ▸ *Title*   : ${(top.title||vQuery).slice(0,38)}`,
                      top.channel  ? `║ ▸ *Channel* : ${top.channel.slice(0,30)}` : null,
                      top.duration ? `║ ▸ *Length*  : ${top.duration}` : null,
                      `║ ▸ *Size*    : ${(buf.length/1024/1024).toFixed(2)} MB`,
                      `║`, `╚═╝`
                  ].filter(Boolean).join('\n');
                  await sock.sendMessage(msg.key.remoteJid, { video: buf, caption: banner }, { quoted: msg });
                  return true;
              } catch { return false; }
          }

          case 'weather':
              return !!(await loadCmd(path.join(__dirname, '../toosi-cmds/utility/weather.js'))
                  .execute(sock, msg, detected.args, prefix, ctx).catch(() => null));

          case 'crypto':
              return !!(await loadCmd(path.join(__dirname, '../toosi-cmds/utility/crypto.js'))
                  .execute(sock, msg, detected.args, prefix, ctx).catch(() => null));

          case 'translate':
              return !!(await loadCmd(path.join(__dirname, '../toosi-cmds/utility/translate.js'))
                  .execute(sock, msg, detected.args, prefix, ctx).catch(() => null));

          case 'calc':
              return !!(await loadCmd(path.join(__dirname, '../toosi-cmds/utility/calc.js'))
                  .execute(sock, msg, detected.args, prefix, ctx).catch(() => null));

          case 'recipe':
              return !!(await loadCmd(path.join(__dirname, '../toosi-cmds/search/recipe.js'))
                  .execute(sock, msg, detected.args, prefix, ctx).catch(() => null));

          case 'news':
              return !!(await loadCmd(path.join(__dirname, '../toosi-cmds/news/newscmds.js'))
                  .execute(sock, msg, detected.args, prefix, ctx).catch(() => null));

          case 'wiki':
              return !!(await loadCmd(path.join(__dirname, '../toosi-cmds/search/wiki.js'))
                  .execute(sock, msg, detected.args, prefix, ctx).catch(() => null));

          default: return false;
      }
  }

  module.exports = { detectIntent, runIntent };