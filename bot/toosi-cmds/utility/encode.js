'use strict';
// ─────────────────────────────────────────────────────────────
//  Encoding/Decoding Utilities — no external API needed
// ─────────────────────────────────────────────────────────────

function getInput(msg, args) {
    const direct = args.join(' ').trim();
    if (direct) return direct;
    const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (q) return q.conversation || q.extendedTextMessage?.text || '';
    return '';
}

module.exports = [
    {
        name: 'ebinary',
        aliases: ['texttobin', 'txt2bin'],
        description: 'Convert text to binary',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            try { await sock.sendMessage(chatId, { react: { text: '🔢', key: msg.key } }); } catch {}
            const input = getInput(msg, args);
            if (!input) return sock.sendMessage(chatId, { text: `╔═|〔  ENCODE 〕\n║\n║ ▸ *Usage* : ${prefix}ebinary <text>\n║           or reply to a message\n║\n╚═╝` }, { quoted: msg });
            if (input.length > 500) return sock.sendMessage(chatId, { text: `╔═|〔  ENCODE 〕\n║\n║ ▸ Text too long (max 500 chars)\n║\n╚═╝` }, { quoted: msg });
            const result = [...input].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  BINARY ENCODE 〕\n║\n║ ▸ *Input* : ${input}\n║\n║ ▸ *Binary* :\n║ ${result.match(/.{1,40}/g).join('\n║ ')}\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'debinary',
        aliases: ['bintotext', 'bin2txt'],
        description: 'Convert binary to text',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            try { await sock.sendMessage(chatId, { react: { text: '🔡', key: msg.key } }); } catch {}
            const input = getInput(msg, args);
            if (!input) return sock.sendMessage(chatId, { text: `╔═|〔  DECODE 〕\n║\n║ ▸ *Usage* : ${prefix}debinary <binary>\n║           or reply to a binary message\n║\n╚═╝` }, { quoted: msg });
            try {
                const cleaned = input.replace(/[^01\s]/g, '').trim();
                const bytes   = cleaned.split(/\s+/).filter(b => b.length === 8);
                if (!bytes.length) throw new Error('Invalid binary format');
                const result  = bytes.map(b => String.fromCharCode(parseInt(b, 2))).join('');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  BINARY DECODE 〕\n║\n║ ▸ *Result* : ${result}\n║\n╚═╝`,
                }, { quoted: msg });
            } catch {
                await sock.sendMessage(chatId, { text: `╔═|〔  DECODE 〕\n║\n║ ▸ ❌ Invalid binary input\n║ ▸ Format: 01001000 01101001\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },

    {
        name: 'ebase',
        aliases: ['tobase64', 'base64encode', 'b64enc'],
        description: 'Encode text to Base64',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            try { await sock.sendMessage(chatId, { react: { text: '🔐', key: msg.key } }); } catch {}
            const input = getInput(msg, args);
            if (!input) return sock.sendMessage(chatId, { text: `╔═|〔  ENCODE 〕\n║\n║ ▸ *Usage* : ${prefix}ebase <text>\n║\n╚═╝` }, { quoted: msg });
            if (input.length > 1000) return sock.sendMessage(chatId, { text: `╔═|〔  ENCODE 〕\n║\n║ ▸ Text too long (max 1000 chars)\n║\n╚═╝` }, { quoted: msg });
            const result = Buffer.from(input, 'utf-8').toString('base64');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  BASE64 ENCODE 〕\n║\n║ ▸ *Input* : ${input.slice(0, 60)}${input.length > 60 ? '...' : ''}\n║\n║ ▸ *Base64* :\n║ ${result.match(/.{1,50}/g).join('\n║ ')}\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'dbase',
        aliases: ['frombase64', 'base64decode', 'b64dec'],
        description: 'Decode Base64 to text',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            try { await sock.sendMessage(chatId, { react: { text: '🔓', key: msg.key } }); } catch {}
            const input = getInput(msg, args);
            if (!input) return sock.sendMessage(chatId, { text: `╔═|〔  DECODE 〕\n║\n║ ▸ *Usage* : ${prefix}dbase <base64>\n║\n╚═╝` }, { quoted: msg });
            try {
                const result = Buffer.from(input.trim(), 'base64').toString('utf-8');
                if (!result) throw new Error('Empty result');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  BASE64 DECODE 〕\n║\n║ ▸ *Result* : ${result}\n║\n╚═╝`,
                }, { quoted: msg });
            } catch {
                await sock.sendMessage(chatId, { text: `╔═|〔  DECODE 〕\n║\n║ ▸ ❌ Invalid Base64 input\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },

    {
        name: 'ehex',
        aliases: ['tohex', 'texttohex'],
        description: 'Encode text to Hexadecimal',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            try { await sock.sendMessage(chatId, { react: { text: '🔢', key: msg.key } }); } catch {}
            const input = getInput(msg, args);
            if (!input) return sock.sendMessage(chatId, { text: `╔═|〔  ENCODE 〕\n║\n║ ▸ *Usage* : ${prefix}ehex <text>\n║\n╚═╝` }, { quoted: msg });
            const result = Buffer.from(input, 'utf-8').toString('hex').match(/.{2}/g).join(' ');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  HEX ENCODE 〕\n║\n║ ▸ *Input* : ${input.slice(0, 60)}\n║\n║ ▸ *Hex* :\n║ ${result.match(/.{1,48}/g).join('\n║ ')}\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'dhex',
        aliases: ['fromhex', 'hextotext'],
        description: 'Decode Hexadecimal to text',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            try { await sock.sendMessage(chatId, { react: { text: '🔡', key: msg.key } }); } catch {}
            const input = getInput(msg, args);
            if (!input) return sock.sendMessage(chatId, { text: `╔═|〔  DECODE 〕\n║\n║ ▸ *Usage* : ${prefix}dhex <hex>\n║\n╚═╝` }, { quoted: msg });
            try {
                const cleaned = input.replace(/\s+/g, '');
                if (!/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length % 2 !== 0) throw new Error('Invalid hex');
                const result = Buffer.from(cleaned, 'hex').toString('utf-8');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  HEX DECODE 〕\n║\n║ ▸ *Result* : ${result}\n║\n╚═╝`,
                }, { quoted: msg });
            } catch {
                await sock.sendMessage(chatId, { text: `╔═|〔  DECODE 〕\n║\n║ ▸ ❌ Invalid hex input\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },
];
