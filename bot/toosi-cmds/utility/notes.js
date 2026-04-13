'use strict';
// ─────────────────────────────────────────────────────────────
//  Notes System — personal per-user notes, JSON-file storage
// ─────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

const NOTES_FILE = path.join(__dirname, '../../data/notes.json');

function loadNotes() {
    try { return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8')); } catch { return {}; }
}
function saveNotes(data) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Normalize JID — strip device suffix so notes are per-number not per-device
function normJid(jid) {
    return jid.replace(/:\d+@/, '@').split('@')[0] + '@s.whatsapp.net';
}

function getSender(msg) {
    const raw = msg.key.participant || msg.key.remoteJid;
    return normJid(raw);
}

function getQuotedText(msg) {
    const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q) return '';
    return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '';
}

module.exports = [
    {
        name: 'notes',
        aliases: ['notehelp', 'notesmenu'],
        description: 'Show all notes commands',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            try { await sock.sendMessage(chatId, { react: { text: '📝', key: msg.key } }); } catch {}
            await sock.sendMessage(chatId, {
                text: `╔═|〔  📝 NOTES 〕\n║\n║ ▸ *${prefix}addnote* <text>    — Add a note\n║ ▸ *${prefix}getnote* <#>       — View a note\n║ ▸ *${prefix}getnotes*          — List all notes\n║ ▸ *${prefix}updatenote* <#> <text> — Edit\n║ ▸ *${prefix}delnote* <#>       — Delete one\n║ ▸ *${prefix}delallnotes*       — Delete all\n║\n║ ▸ Notes are private — only you can see them\n║ ▸ You can also reply to any message with\n║   *${prefix}addnote* to save it\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'addnote',
        aliases: ['newnote', 'makenote', 'savenote'],
        description: 'Add a new personal note',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            try { await sock.sendMessage(chatId, { react: { text: '📝', key: msg.key } }); } catch {}

            let content = args.join(' ').trim();
            if (!content) content = getQuotedText(msg);
            if (!content) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ *Usage* : ${prefix}addnote <text>\n║           or reply to a message\n║\n╚═╝`,
            }, { quoted: msg });

            const db    = loadNotes();
            if (!db[sender]) db[sender] = [];
            const nextId = (db[sender].length > 0 ? Math.max(...db[sender].map(n => n.id)) : 0) + 1;
            const note   = { id: nextId, content, createdAt: new Date().toISOString() };
            db[sender].push(note);
            saveNotes(db);

            const preview = content.length > 40 ? content.slice(0, 40) + '...' : content;
            await sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ ✅ Note #${nextId} saved!\n║ ▸ "${preview}"\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'getnote',
        aliases: ['viewnote', 'shownote', 'readnote'],
        description: 'Get a specific note by number',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const num    = parseInt(args[0]);
            if (isNaN(num)) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ *Usage* : ${prefix}getnote <number>\n║\n╚═╝`,
            }, { quoted: msg });

            const db   = loadNotes();
            const list = db[sender] || [];
            const note = list.find(n => n.id === num);
            if (!note) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ Note #${num} not found\n║ ▸ Use *${prefix}getnotes* to see all\n║\n╚═╝`,
            }, { quoted: msg });

            const date = new Date(note.createdAt).toLocaleString('en-GB', { timeZone: process.env.TIME_ZONE || 'Africa/Nairobi' });
            await sock.sendMessage(chatId, {
                text: `╔═|〔  📝 NOTE #${note.id} 〕\n║\n${note.content.split('\n').map(l => `║  ${l}`).join('\n')}\n║\n║ ▸ Saved: ${date}\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'getnotes',
        aliases: ['listnotes', 'allnotes', 'mynotes'],
        description: 'List all your personal notes',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const db     = loadNotes();
            const list   = db[sender] || [];

            if (list.length === 0) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ You have no notes yet\n║ ▸ Use *${prefix}addnote* to create one\n║\n╚═╝`,
            }, { quoted: msg });

            const items = list.map(n => {
                const preview = n.content.length > 45 ? n.content.slice(0, 45) + '...' : n.content;
                return `║  #${n.id} — ${preview}`;
            }).join('\n');

            await sock.sendMessage(chatId, {
                text: `╔═|〔  📝 YOUR NOTES (${list.length}) 〕\n║\n${items}\n║\n║ ▸ *${prefix}getnote* <#> to read one\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'updatenote',
        aliases: ['editnote', 'modifynote'],
        description: 'Update an existing note',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const num    = parseInt(args[0]);
            const newContent = args.slice(1).join(' ').trim();

            if (isNaN(num) || !newContent) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ *Usage* : ${prefix}updatenote <#> <new text>\n║\n╚═╝`,
            }, { quoted: msg });

            const db   = loadNotes();
            const list = db[sender] || [];
            const idx  = list.findIndex(n => n.id === num);
            if (idx === -1) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ Note #${num} not found\n║\n╚═╝`,
            }, { quoted: msg });

            list[idx].content   = newContent;
            list[idx].updatedAt = new Date().toISOString();
            db[sender] = list;
            saveNotes(db);

            const preview = newContent.length > 40 ? newContent.slice(0, 40) + '...' : newContent;
            await sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ ✅ Note #${num} updated!\n║ ▸ "${preview}"\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'delnote',
        aliases: ['deletenote', 'removenote'],
        description: 'Delete a specific note',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const num    = parseInt(args[0]);
            if (isNaN(num)) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ *Usage* : ${prefix}delnote <number>\n║\n╚═╝`,
            }, { quoted: msg });

            const db   = loadNotes();
            const list = (db[sender] || []);
            const idx  = list.findIndex(n => n.id === num);
            if (idx === -1) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ Note #${num} not found\n║\n╚═╝`,
            }, { quoted: msg });

            list.splice(idx, 1);
            db[sender] = list;
            saveNotes(db);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ ✅ Note #${num} deleted\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },

    {
        name: 'delallnotes',
        aliases: ['clearnotes', 'deleteallnotes'],
        description: 'Delete all your notes',
        category: 'utility',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const db     = loadNotes();
            const count  = (db[sender] || []).length;

            if (count === 0) return sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ You have no notes to delete\n║\n╚═╝`,
            }, { quoted: msg });

            delete db[sender];
            saveNotes(db);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  NOTES 〕\n║\n║ ▸ ✅ All ${count} note${count > 1 ? 's' : ''} deleted\n║\n╚═╝`,
            }, { quoted: msg });
        }
    },
];
