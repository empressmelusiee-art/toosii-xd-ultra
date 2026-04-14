'use strict';

const { getBotName } = require('../../lib/botname');

const SAFE_PATTERN = /^[0-9+\-*\/().%\s,eE^sqrtpilognabcfmorx]+$/i;

function safeEval(expr) {
    const clean = expr
        .replace(/\^/g, '**')
        .replace(/\bsqrt\b/gi, 'Math.sqrt')
        .replace(/\bpi\b/gi, 'Math.PI')
        .replace(/\bsin\b/gi, 'Math.sin')
        .replace(/\bcos\b/gi, 'Math.cos')
        .replace(/\btan\b/gi, 'Math.tan')
        .replace(/\blog\b/gi, 'Math.log10')
        .replace(/\bln\b/gi,  'Math.log')
        .replace(/\babs\b/gi, 'Math.abs')
        .replace(/\bceil\b/gi,'Math.ceil')
        .replace(/\bfloor\b/gi,'Math.floor')
        .replace(/\bround\b/gi,'Math.round')
        .replace(/\bmax\b/gi, 'Math.max')
        .replace(/\bmin\b/gi, 'Math.min')
        .replace(/\bpow\b/gi, 'Math.pow')
        .replace(/,/g, '.');

    if (!SAFE_PATTERN.test(expr.replace(/\s/g, ''))) {
        throw new Error('Only math expressions allowed');
    }

    const fn = new Function(`"use strict"; return (${clean});`);
    const result = fn();
    if (result === undefined || result === null) throw new Error('Expression returned nothing');
    if (!isFinite(result)) throw new Error('Result is infinite or NaN');
    return result;
}

function fmt(n) {
    if (Number.isInteger(n)) return n.toLocaleString('en-US');
    const s = parseFloat(n.toPrecision(10)).toString();
    const [int, dec] = s.split('.');
    return `${parseInt(int).toLocaleString('en-US')}${dec ? '.' + dec : ''}`;
}

module.exports = {
    name: 'calc',
    aliases: ['calculate', 'math', 'calculator', 'eval', 'compute'],
    description: 'Calculate any math expression — .calc <expression>',
    category: 'utility',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🧮', key: msg.key } }); } catch {}

        const ctxQuoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = ctxQuoted?.conversation || ctxQuoted?.extendedTextMessage?.text;
        const expr = args.join(' ').trim() || quotedText?.trim();

        if (!expr) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  CALCULATOR 🧮 〕`,
                    `║`,
                    `║ ▸ *Usage*   : ${prefix}calc <expression>`,
                    `║ ▸ *Example* : ${prefix}calc 25 * 4 + 10`,
                    `║ ▸ *Example* : ${prefix}calc sqrt(144)`,
                    `║ ▸ *Example* : ${prefix}calc 2^10`,
                    `║ ▸ *Ops*     : + - * / ^ % sqrt log sin cos`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        try {
            const result  = safeEval(expr);
            const display = fmt(result);

            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  CALCULATOR 🧮 〕`,
                    `║`,
                    `║ ▸ *Expr*   : ${expr}`,
                    `║ ▸ *Result* : *${display}*`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  CALCULATOR 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║ ▸ *Hint*   : ${prefix}calc 25*4 or sqrt(144)\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
