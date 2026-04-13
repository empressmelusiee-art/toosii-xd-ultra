'use strict';

const { getBotName } = require('../../lib/botname');

async function fetchQuote() {
    const res  = await fetch('https://api.quotable.io/random', { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    return { text: data.content, author: data.author };
}

async function fetchJoke() {
    const res  = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode&type=single', { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    return data.joke || `${data.setup}\n${data.delivery}`;
}

async function fetchFact() {
    const res  = await fetch('https://uselessfacts.jsph.pl/random.json?language=en', { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    return data.text;
}

module.exports = {
    name: 'quotable',
    aliases: ['quotabl', 'qfun'],
    description: 'Get a random quote from public Quotable API',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const cmd    = (msg.message?.extendedTextMessage?.text || msg.message?.conversation || '').replace(prefix, '').split(' ')[0].toLowerCase();

        try { await sock.sendMessage(chatId, { react: { text: '🎲', key: msg.key } }); } catch {}

        try {
            if (cmd === 'joke') {
                const joke = await fetchJoke();
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  JOKE 〕\n║\n║ ${joke.replace(/\n/g, '\n║ ')}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            if (cmd === 'fact') {
                const fact = await fetchFact();
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  FUN FACT 〕\n║\n║ ${fact}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            // Default: quote
            const { text, author } = await fetchQuote();
            await sock.sendMessage(chatId, {
                text: `╔═|〔  QUOTE 〕\n║\n║ _"${text}"_\n║\n║ ▸ *—* ${author}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  FUN 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
