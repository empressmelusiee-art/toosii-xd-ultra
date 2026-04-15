'use strict';

  const { getBotName }           = require('../../lib/botname');
  const { detectIntent, runIntent } = require('../../lib/ai-intent');

  async function pollinationsAI(prompt, model = 'openai', timeoutMs = 30000) {
      const encoded = encodeURIComponent(prompt);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
          const res = await fetch(`https://text.pollinations.ai/${encoded}?model=${model}`, {
              signal: controller.signal,
              headers: { 'User-Agent': 'ToosiiBot/1.0', Accept: 'text/plain,*/*' }
          });
          if (!res.ok) throw new Error(`AI service returned HTTP ${res.status}`);
          const text = await res.text();
          if (!text?.trim()) throw new Error('No response from AI');
          return text.trim();
      } finally { clearTimeout(timer); }
  }

  module.exports = {
      name: 'ai',
      aliases: ['toosii', 'toosiiAi', 'toosiiai', 'ask'],
      description: 'Chat with Toosii AI — powered by live bot APIs',
      category: 'ai',

      async execute(sock, msg, args, prefix, ctx) {
          const chatId = msg.key.remoteJid;
          const prompt = args.join(' ').trim();

          if (!prompt) {
              return sock.sendMessage(chatId, {
                  text: [
                      `╔═|〔  🤖 TOOSII AI 〕`, `║`,
                      `║ ▸ *Usage*   : ${prefix}ai <anything>`, `║`,
                      `║ ▸ *Examples*:`,
                      `║   ${prefix}ai play Rema Calm Down`,
                      `║   ${prefix}ai weather in Nairobi`,
                      `║   ${prefix}ai price of bitcoin`,
                      `║   ${prefix}ai translate hello to french`,
                      `║   ${prefix}ai recipe for jollof rice`,
                      `║   ${prefix}ai who is Elon Musk`,
                      `║   ${prefix}ai calculate 25 * 4`,
                      `║   ${prefix}ai latest news`,
                      `║`, `╚═╝`
                  ].join('\n')
              }, { quoted: msg });
          }

          // ── Step 1: Try intent → real API ─────────────────────────────────
          try {
              const detected = detectIntent(prompt);
              if (detected && detected.args.length) {
                  await sock.sendMessage(chatId, { react: { text: '⚡', key: msg.key } });
                  const handled = await runIntent(sock, msg, detected, prefix, ctx);
                  if (handled) return;
              }
          } catch {}

          // ── Step 2: Plain AI fallback ──────────────────────────────────────
          try {
              await sock.sendMessage(chatId, { react: { text: '🤖', key: msg.key } });
              const reply = await pollinationsAI(prompt, 'openai');
              const fmtReply = reply.split('\n').map(l => `║ ${l}`).join('\n');
              await sock.sendMessage(chatId, {
                  text: `╔═|〔  🤖 TOOSII AI 〕\n║\n${fmtReply}\n║\n╚═╝`
              }, { quoted: msg });
          } catch (e) {
              await sock.sendMessage(chatId, {
                  text: `╔═|〔  🤖 TOOSII AI 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
              }, { quoted: msg });
          }
      }
  };