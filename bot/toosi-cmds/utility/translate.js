'use strict';

const { getBotName } = require('../../lib/botname');

const LANG_MAP = {
    english: 'en', english: 'en', french: 'fr', spanish: 'es', arabic: 'ar',
    swahili: 'sw', german: 'de', portuguese: 'pt', chinese: 'zh', japanese: 'ja',
    korean: 'ko', hindi: 'hi', russian: 'ru', italian: 'it', turkish: 'tr',
};

module.exports = {
    name: 'translate',
    aliases: ['tr', 'trans', 'tl'],
    description: 'Translate text to any language',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '🌐', key: msg.key } }); } catch {}

        // Usage: .tr <lang> <text>  OR reply to a message with .tr <lang>
        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quotedText = ctxInfo?.quotedMessage?.conversation
            || ctxInfo?.quotedMessage?.extendedTextMessage?.text
            || ctxInfo?.quotedMessage?.imageMessage?.caption
            || ctxInfo?.quotedMessage?.videoMessage?.caption;

        let targetLang = (args[0] || 'en').toLowerCase();
        // Resolve full name to code
        targetLang = LANG_MAP[targetLang] || targetLang;

        const textToTranslate = quotedText || args.slice(1).join(' ') || (args.length === 1 && args[0].length > 2 ? null : null);

        if (!textToTranslate && !quotedText) {
            const text2 = args.length > 1 ? args.slice(1).join(' ') : null;
            if (!text2) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  TRANSLATE 〕\n║\n║ ▸ *Usage* : ${prefix}tr <lang> <text>\n║           OR reply a message with\n║           ${prefix}tr <lang>\n║ ▸ *Langs* : en, es, fr, ar, sw,\n║            de, pt, zh, ja, ko...\n║\n╚═╝`
                }, { quoted: msg });
            }
        }

        const finalText = quotedText || args.slice(1).join(' ');
        if (!finalText) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  TRANSLATE 〕\n║\n║ ▸ *Usage* : ${prefix}tr <lang> <text>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            const res = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(finalText)}&langpair=auto|${targetLang}`,
                { signal: AbortSignal.timeout(15000) }
            );
            const data = await res.json();
            const translated = data?.responseData?.translatedText;
            if (!translated) throw new Error('No translation returned');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  TRANSLATE 〕\n║\n║ ▸ *Lang*   : ${targetLang.toUpperCase()}\n║ ▸ *Input*  : ${finalText.slice(0, 80)}\n║ ▸ *Result* : ${translated.slice(0, 300)}\n║\n╚═╝`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  TRANSLATE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
