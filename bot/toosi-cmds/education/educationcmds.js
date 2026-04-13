'use strict';

const { getBotName } = require('../../lib/botname');
const BASE = 'https://apiskeith.top';

async function kFetch(path) {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ── 1. DICTIONARY ─────────────────────────────────────────────────────────────
const dictCmd = {
    name: 'dict',
    aliases: ['dictionary', 'define', 'meaning'],
    description: 'Get the definition of a word',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📖', key: msg.key } }); } catch {}

        const word = args[0]?.toLowerCase().trim();
        if (!word) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  DICTIONARY 〕\n║\n║ ▸ *Usage*   : ${prefix}dict <word>\n║ ▸ *Example* : ${prefix}dict serendipity\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data  = await kFetch(`/education/dictionary?q=${encodeURIComponent(word)}`);
            const r     = data?.result;
            if (!r?.word) throw new Error('Word not found');

            const phonetic = r.phonetics?.find(p => p.text)?.text || '';
            const meanings = r.meanings || [];
            let out = `╔═|〔  DICTIONARY 〕\n║\n║ ▸ *Word*  : ${r.word}${phonetic ? `  _${phonetic}_` : ''}\n║`;

            for (const m of meanings.slice(0, 3)) {
                out += `\n║ ▸ *${m.partOfSpeech}*`;
                for (const d of (m.definitions || []).slice(0, 2)) {
                    out += `\n║   • ${d.definition}`;
                    if (d.example) out += `\n║     _"${d.example}"_`;
                }
                out += `\n║`;
            }
            out += `\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text: out }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  DICTIONARY 〕\n║\n║ ▸ *Status* : ❌ Not found\n║ ▸ *Word*   : ${word}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 2. FRUIT INFO ─────────────────────────────────────────────────────────────
const fruitCmd = {
    name: 'fruit',
    aliases: ['fruitinfo', 'fruity'],
    description: 'Get nutritional info about a fruit',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🍎', key: msg.key } }); } catch {}

        const q = args.join(' ').trim();
        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  FRUIT INFO 〕\n║\n║ ▸ *Usage*   : ${prefix}fruit <name>\n║ ▸ *Example* : ${prefix}fruit mango\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await kFetch(`/education/fruit?q=${encodeURIComponent(q)}`);
            const r    = data?.result;
            if (!r?.name) throw new Error('Fruit not found');

            const nut = r.nutritions || {};
            const lines = [
                `╔═|〔  FRUIT INFO 〕`,
                `║`,
                `║ ▸ *Name*    : ${r.name}`,
                r.family   ? `║ ▸ *Family*  : ${r.family}`   : null,
                r.genus    ? `║ ▸ *Genus*   : ${r.genus}`    : null,
                r.order    ? `║ ▸ *Order*   : ${r.order}`    : null,
                `║`,
                `║ 📊 *Nutritions (per 100g)*`,
                nut.calories    !== undefined ? `║   • Calories  : ${nut.calories} kcal` : null,
                nut.carbohydrates !== undefined ? `║   • Carbs     : ${nut.carbohydrates}g` : null,
                nut.protein     !== undefined ? `║   • Protein   : ${nut.protein}g`   : null,
                nut.fat         !== undefined ? `║   • Fat       : ${nut.fat}g`       : null,
                nut.sugar       !== undefined ? `║   • Sugar     : ${nut.sugar}g`     : null,
                nut.fiber       !== undefined ? `║   • Fiber     : ${nut.fiber}g`     : null,
                `║`,
                `╚═|〔 ${name} 〕`,
            ].filter(Boolean).join('\n');

            await sock.sendMessage(chatId, { text: lines }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  FRUIT INFO 〕\n║\n║ ▸ *Status* : ❌ Not found\n║ ▸ *Fruit*  : ${q}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 3. GRAMMAR CHECK ──────────────────────────────────────────────────────────
const grammarCmd = {
    name: 'grammar',
    aliases: ['gramcheck', 'gc', 'grcheck'],
    description: 'Check and correct grammar in a sentence',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '✍️', key: msg.key } }); } catch {}

        const ctxQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quoted    = ctxQuoted?.conversation || ctxQuoted?.extendedTextMessage?.text;
        const text      = args.join(' ') || quoted;

        if (!text) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  GRAMMAR CHECK 〕\n║\n║ ▸ *Usage*   : ${prefix}grammar <sentence>\n║           OR reply text with ${prefix}grammar\n║ ▸ *Example* : ${prefix}grammar she dont know nothing\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data  = await kFetch(`/grammarcheck?q=${encodeURIComponent(text)}`);
            const recs  = data?.result?.recommendations;
            if (!recs?.length) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  GRAMMAR CHECK 〕\n║\n║ ▸ *Input*  : ${text.slice(0, 100)}\n║ ▸ *Status* : ✅ No errors found\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            let out = `╔═|〔  GRAMMAR CHECK 〕\n║\n║ ▸ *Input* : ${text.slice(0, 100)}\n║`;
            for (const rec of recs.slice(0, 5)) {
                const original = rec.original || rec.text || '';
                const fixed    = rec.corrected || rec.suggestion || rec.fix || '';
                const reason   = rec.reason || rec.description || rec.type || '';
                if (original || fixed) {
                    out += `\n║ ▸ *❌ Was*   : ${original}`;
                    if (fixed)  out += `\n║ ▸ *✅ Fix*   : ${fixed}`;
                    if (reason) out += `\n║   _${String(reason).slice(0, 80)}_`;
                    out += `\n║`;
                }
            }
            out += `\n╚═|〔 ${name} 〕`;

            await sock.sendMessage(chatId, { text: out }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  GRAMMAR CHECK 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 4. PHYSICS AI ─────────────────────────────────────────────────────────────
const physicsCmd = {
    name: 'physics',
    aliases: ['phys', 'science'],
    description: 'Ask a physics question and get an AI answer',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '⚛️', key: msg.key } }); } catch {}

        const q = args.join(' ').trim();
        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  PHYSICS AI 〕\n║\n║ ▸ *Usage*   : ${prefix}physics <question>\n║ ▸ *Example* : ${prefix}physics what is Ohm's law\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await kFetch(`/education/physics?q=${encodeURIComponent(q)}`);
            const ans  = data?.result;
            if (!ans) throw new Error('No answer returned');

            const clean = String(ans)
                .replace(/\$\$.*?\$\$/gs, '')
                .replace(/\$.*?\$/g, '')
                .replace(/\*\*/g, '*')
                .replace(/#{1,3} /g, '▸ ')
                .slice(0, 2000);

            await sock.sendMessage(chatId, {
                text: `╔═|〔  PHYSICS AI 〕\n║\n║ ▸ *Q* : ${q.slice(0, 80)}\n║\n${clean}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  PHYSICS AI 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 5. CHEMISTRY AI ───────────────────────────────────────────────────────────
const chemCmd = {
    name: 'chemistry',
    aliases: ['chem', 'element'],
    description: 'Ask a chemistry question and get an AI answer',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🧪', key: msg.key } }); } catch {}

        const q = args.join(' ').trim();
        if (!q) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CHEMISTRY AI 〕\n║\n║ ▸ *Usage*   : ${prefix}chemistry <question>\n║ ▸ *Example* : ${prefix}chemistry what is sodium\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await kFetch(`/education/chemistry?q=${encodeURIComponent(q)}`);
            const ans  = data?.result;
            if (!ans) throw new Error('No answer returned');

            const clean = String(ans)
                .replace(/\$\$.*?\$\$/gs, '')
                .replace(/\$.*?\$/g, '')
                .replace(/\*\*/g, '*')
                .replace(/#{1,3} /g, '▸ ')
                .slice(0, 2000);

            await sock.sendMessage(chatId, {
                text: `╔═|〔  CHEMISTRY AI 〕\n║\n║ ▸ *Q* : ${q.slice(0, 80)}\n║\n${clean}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  CHEMISTRY AI 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 6. RANDOM POEM ────────────────────────────────────────────────────────────
const poemCmd = {
    name: 'poem',
    aliases: ['poetry', 'randompoem'],
    description: 'Get a random classic poem',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '📜', key: msg.key } }); } catch {}

        try {
            const data  = await kFetch(`/education/randompoem`);
            const r     = data?.result;
            if (!r?.title) throw new Error('No poem returned');

            const lines = (r.lines || []).join('\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  POEM 〕\n║\n║ ▸ *Title*  : ${r.title}\n║ ▸ *Author* : ${r.author || 'Unknown'}\n║\n${lines.slice(0, 1500)}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  POEM 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

// ── 7. CURRENCY EXCHANGE ──────────────────────────────────────────────────────
const currencyCmd = {
    name: 'currency',
    aliases: ['exchange', 'rate', 'forex'],
    description: 'Get USD exchange rate for any currency code',
    category: 'education',
    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '💱', key: msg.key } }); } catch {}

        const code = (args[0] || '').toUpperCase().trim();
        if (!code || code.length < 2) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CURRENCY 〕\n║\n║ ▸ *Usage*   : ${prefix}currency <code>\n║ ▸ *Example* : ${prefix}currency KES\n║ ▸ *Example* : ${prefix}currency EUR\n║ ▸ *Note*    : Base is always USD\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const data = await kFetch(`/finance/exchange?q=${code}`);
            const r    = data?.result;
            if (!r?.rate) throw new Error('Currency not found');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  CURRENCY 〕\n║\n║ ▸ *Base*   : 1 ${r.base || 'USD'}\n║ ▸ *Target* : ${r.target || code}\n║ ▸ *Rate*   : ${r.rate}\n║ ▸ *Date*   : ${r.date || 'Today'}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  CURRENCY 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Code*   : ${code}\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [
    dictCmd,
    fruitCmd,
    grammarCmd,
    physicsCmd,
    chemCmd,
    poemCmd,
    currencyCmd,
];
