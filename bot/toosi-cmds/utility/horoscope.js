'use strict';

const { getBotName } = require('../../lib/botname');

const SIGNS = {
    aries:       '♈', taurus:  '♉', gemini:   '♊', cancer:    '♋',
    leo:         '♌', virgo:   '♍', libra:    '♎', scorpio:   '♏',
    sagittarius: '♐', capricorn:'♑', aquarius: '♒', pisces:    '♓',
};

const SIGN_ALIASES = {
    cap: 'capricorn', sag: 'sagittarius', sage: 'sagittarius',
    scorp: 'scorpio', scorpion: 'scorpio', aqua: 'aquarius',
    gem: 'gemini', lib: 'libra', leo: 'leo',
};

const DAYS = { today: 'today', yesterday: 'yesterday', tomorrow: 'tomorrow' };

function resolveSign(raw) {
    const lower = raw.toLowerCase();
    return SIGN_ALIASES[lower] || (SIGNS[lower] !== undefined ? lower : null);
}

async function getHoroscope(sign, day = 'today') {
    const res = await fetch(`https://aztro.sameerkumar.website/?sign=${sign}&day=${day}`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === 'error' || !data.description) throw new Error('No horoscope returned');
    return data;
}

module.exports = {
    name: 'horoscope',
    aliases: ['horo', 'zodiac', 'starsign', 'dailyhoro', 'stars'],
    description: 'Get daily horoscope for any zodiac sign',
    category: 'utility',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try { await sock.sendMessage(chatId, { react: { text: '🔮', key: msg.key } }); } catch {}

        const SIGN_LIST = Object.keys(SIGNS).map(s => s[0].toUpperCase() + s.slice(1)).join(', ');
        const USAGE = [
            `╔═|〔  HOROSCOPE 🔮 〕`,
            `║`,
            `║ ▸ *Usage*   : ${prefix}horoscope <sign> [today|tomorrow|yesterday]`,
            `║ ▸ *Example* : ${prefix}horoscope scorpio`,
            `║ ▸ *Example* : ${prefix}horoscope leo tomorrow`,
            `║`,
            `║ ▸ *Signs* :`,
            `║   ${SIGN_LIST}`,
            `║`,
            `╚═|〔 ${name} 〕`,
        ].join('\n');

        const rawSign = args[0];
        if (!rawSign) return sock.sendMessage(chatId, { text: USAGE }, { quoted: msg });

        const sign = resolveSign(rawSign);
        if (!sign) return sock.sendMessage(chatId, {
            text: `╔═|〔  HOROSCOPE 〕\n║\n║ ▸ *Unknown sign* : ${rawSign}\n║ ▸ *Valid signs*  : ${Object.keys(SIGNS).join(', ')}\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });

        const rawDay = (args[1] || 'today').toLowerCase();
        const day    = DAYS[rawDay] || 'today';

        try {
            const h = await getHoroscope(sign, day);

            const signLabel = sign[0].toUpperCase() + sign.slice(1);
            const emoji     = SIGNS[sign];
            const dayLabel  = day[0].toUpperCase() + day.slice(1);

            const lines = [
                `╔═|〔  HOROSCOPE 🔮 〕`,
                `║`,
                `║ ▸ *Sign*       : ${emoji} ${signLabel}`,
                `║ ▸ *Day*        : ${dayLabel} (${h.current_date || ''})`,
                `║`,
                `║ 📖 *Reading*:`,
                ...h.description.split('. ').filter(Boolean).map(s => `║   ${s.trim()}.`),
                `║`,
                h.lucky_number   ? `║ ▸ *Lucky No.*  : ${h.lucky_number}` : null,
                h.lucky_time     ? `║ ▸ *Lucky Time* : ${h.lucky_time}`   : null,
                h.color          ? `║ ▸ *Color*      : ${h.color}`        : null,
                h.compatibility  ? `║ ▸ *Compatible* : ${h.compatibility}` : null,
                h.mood           ? `║ ▸ *Mood*       : ${h.mood}`         : null,
                `║`,
                `╚═|〔 ${name} 〕`,
            ].filter(Boolean).join('\n');

            await sock.sendMessage(chatId, { text: lines }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  HOROSCOPE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
