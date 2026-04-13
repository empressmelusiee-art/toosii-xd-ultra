'use strict';

const path = require('path');
const fs   = require('fs');
const { getBotName } = require('../../lib/botname');

const CAT_EMOJI = {
    utility:    '🔧', owner:      '👑', ai:         '🤖',
    group:      '👥', automation: '⚙️', channel:    '📢',
    download:   '📥', games:      '🎮', education:  '📚',
    spiritual:  '🕊️', fun:        '😂', sports:     '⚽',
    news:       '📰', stalker:    '🔍', image:      '🖼️',
    movie:      '🎬', search:     '🔎', adult:      '🔞',
};

const CAT_ORDER = [
    'utility','owner','ai','group','automation','channel',
    'download','education','spiritual','fun','sports',
    'news','stalker','image','movie','search','adult'
];

function loadAll() {
    const cmdsDir = path.join(__dirname, '..');
    const cats    = {};
    const folders = fs.readdirSync(cmdsDir).filter(f => {
        try { return fs.statSync(path.join(cmdsDir, f)).isDirectory(); } catch { return false; }
    });
    for (const cat of folders) {
        const files = fs.readdirSync(path.join(cmdsDir, cat)).filter(f => f.endsWith('.js'));
        cats[cat]   = [];
        for (const file of files) {
            try {
                const mod = require(path.join(cmdsDir, cat, file));
                const list = Array.isArray(mod) ? mod : (mod.name ? [mod] : []);
                for (const c of list) {
                    if (!c?.name) continue;
                    if (c.name.startsWith('_')) continue;
                    cats[cat].push({
                        name:        c.name,
                        aliases:     Array.isArray(c.aliases) ? c.aliases : [],
                        description: c.description || '',
                    });
                }
            } catch {}
        }
        cats[cat].sort((a, b) => a.name.localeCompare(b.name));
    }
    return cats;
}

module.exports = {
    name:        'listall',
    aliases:     ['allcmds', 'cmdlist', 'fullmenu', 'la'],
    description: 'List every command with aliases & description — .listall [category]',
    category:    'utility',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '📋', key: msg.key } }); } catch {}

        const filter = args.join(' ').trim().toLowerCase();
        const cats   = loadAll();

        // If user typed an unknown category, show available ones
        if (filter && !Object.keys(cats).some(k => k === filter || k.startsWith(filter))) {
            const available = CAT_ORDER
                .filter(k => cats[k]?.length)
                .map(k => `${CAT_EMOJI[k]||'📌'} ${k}`)
                .join('  •  ');
            return sock.sendMessage(chatId, {
                text: `╔═|〔  📋 COMMAND LIST 〕\n║\n║ ▸ Category *"${filter}"* not found\n║\n║ *Available:*\n║ ${available}\n║\n║ 💡 Try: ${prefix}listall ai\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // Pick which categories to show
        const sorted = [
            ...CAT_ORDER.filter(k => cats[k]?.length),
            ...Object.keys(cats).filter(k => !CAT_ORDER.includes(k) && cats[k]?.length),
        ].filter(k => !filter || k.startsWith(filter));

        const lines = [];
        let   total = 0;

        if (!filter) {
            const allTotal = sorted.reduce((s, k) => s + (cats[k]?.length || 0), 0);
            lines.push(`╔═|〔  📋 ALL COMMANDS 〕`);
            lines.push(`║`);
            lines.push(`║ ▸ *Total* : ${allTotal} commands across ${sorted.length} categories`);
            lines.push(`║ ▸ *Tip*   : ${prefix}listall <category> for focused view`);
            lines.push(`║ ▸ *E.g.*  : ${prefix}listall ai • ${prefix}listall group`);
            lines.push(`║`);
        } else {
            const match = sorted[0];
            const cnt   = cats[match]?.length || 0;
            lines.push(`╔═|〔  📋 ${(CAT_EMOJI[match]||'📌')} ${match.toUpperCase()} COMMANDS 〕`);
            lines.push(`║`);
            lines.push(`║ ▸ *${cnt} command${cnt !== 1 ? 's' : ''}* in this category`);
            lines.push(`║`);
        }

        for (const cat of sorted) {
            const cmds = cats[cat];
            if (!cmds?.length) continue;
            const emoji = CAT_EMOJI[cat] || '📌';

            if (!filter) {
                lines.push(`╠══ ${emoji} *${cat.toUpperCase()}* (${cmds.length})`);
            }

            for (const c of cmds) {
                total++;
                const aliasStr = c.aliases.length
                    ? ` _(${c.aliases.slice(0, 3).join(', ')})_`
                    : '';
                const desc = c.description
                    ? `\n║    📌 ${c.description.replace(/^[^—–\-]*[-–—]\s*/, '').substring(0, 60)}`
                    : '';
                lines.push(`║  ◇ *${prefix}${c.name}*${aliasStr}${desc}`);
            }
            lines.push(`║`);
        }

        if (!filter) {
            lines.push(`╚═|〔 ${name} — ${total} total commands 〕`);
        } else {
            lines.push(`╚═|〔 ${name} 〕`);
        }

        const text = lines.join('\n');

        // If it's a full list, split into chunks of ~4000 chars to avoid WhatsApp limit
        if (text.length <= 4000) {
            return sock.sendMessage(chatId, { text }, { quoted: msg });
        }

        const chunks = [];
        let   chunk  = '';
        for (const line of lines) {
            if ((chunk + line + '\n').length > 3800) {
                chunks.push(chunk.trim());
                chunk = '';
            }
            chunk += line + '\n';
        }
        if (chunk.trim()) chunks.push(chunk.trim());

        for (let i = 0; i < chunks.length; i++) {
            const part = i === 0
                ? chunks[i]
                : `╔═|〔 📋 (continued ${i + 1}/${chunks.length}) 〕\n║\n${chunks[i]}`;
            await sock.sendMessage(chatId, { text: part }, i === 0 ? { quoted: msg } : {});
            if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 800));
        }
    }
};
