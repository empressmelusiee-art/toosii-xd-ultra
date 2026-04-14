'use strict';

const { getBotName } = require('../../lib/botname');

function shipScore(a, b) {
    // Deterministic but looks random — based on combined name chars
    const str = (a + b).toLowerCase().replace(/\s/g, '');
    let hash = 0;
    for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
    return Math.abs(hash) % 101; // 0–100
}

function shipBar(pct) {
    const filled = Math.round(pct / 10);
    return '❤️'.repeat(filled) + '🖤'.repeat(10 - filled);
}

function shipLabel(pct) {
    if (pct >= 95) return '💍 SOULMATES — get married already!';
    if (pct >= 85) return '🔥 FIRE COUPLE — unstoppable!';
    if (pct >= 70) return '💕 Great match — sparks are flying!';
    if (pct >= 55) return '😊 Decent chemistry — keep trying!';
    if (pct >= 40) return '🤔 It\'s complicated...';
    if (pct >= 25) return '😬 Risky territory — proceed with caution!';
    if (pct >= 10) return '💔 Not looking good...';
    return '😂 YIKES — just be friends!';
}

const COMPLIMENTS = [
    'You two would make beautiful babies 👶',
    'The stars align for you both ⭐',
    'Even the bot ships it 🤖❤️',
    'Would be the cutest couple in the group 😍',
    'Netflix and chill incoming 📺',
    'The chemistry is undeniable 🧪',
];

const ROASTS = [
    'Even the WiFi disconnects when you two meet 📶',
    'This ship has already sunk 🚢💀',
    'Chalk and cheese 🧀',
    'Oil and water don\'t mix 💧🛢️',
    'Please don\'t 😭',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports = {
    name: 'ship',
    aliases: ['lovemeter', 'compatibility', 'lovetest', 'matchmaker', 'crush'],
    description: 'Check compatibility between two people — .ship <name1> + <name2>',
    category: 'fun',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        const raw  = args.join(' ');
        const sep  = raw.includes('+') ? '+' : raw.includes(' and ') ? ' and ' : raw.includes('&') ? '&' : null;

        let nameA, nameB;
        if (sep) {
            const parts = raw.split(sep).map(s => s.trim()).filter(Boolean);
            nameA = parts[0];
            nameB = parts[1];
        } else if (args.length >= 2) {
            nameA = args[0];
            nameB = args.slice(1).join(' ');
        }

        if (!nameA || !nameB) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  SHIP ❤️ 〕`,
                    `║`,
                    `║ ▸ *Usage* : ${prefix}ship <name1> + <name2>`,
                    `║ ▸ *Example* : ${prefix}ship Toosii + Amara`,
                    `║ ▸ *Example* : ${prefix}ship John and Jane`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        const pct     = shipScore(nameA, nameB);
        const bar     = shipBar(pct);
        const label   = shipLabel(pct);
        const comment = pct >= 50 ? pick(COMPLIMENTS) : pick(ROASTS);

        // Combine their names
        const half1  = nameA.slice(0, Math.ceil(nameA.length / 2));
        const half2  = nameB.slice(Math.floor(nameB.length / 2));
        const shipName = half1 + half2;

        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  SHIP ❤️ 〕`,
                `║`,
                `║ ▸ *${nameA}* ❤️ *${nameB}*`,
                `║`,
                `║ ▸ *Ship name* : ${shipName}`,
                `║ ▸ *Score*     : ${pct}%`,
                `║`,
                `║ ${bar}`,
                `║`,
                `║ ▸ ${label}`,
                `║ ▸ 💬 ${comment}`,
                `║`,
                `╚═╝`,
            ].join('\n')
        }, { quoted: msg });
    }
};
