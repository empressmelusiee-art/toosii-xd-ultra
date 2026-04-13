'use strict';
// ─────────────────────────────────────────────────────────────
//  Join Request Management — accept/reject group join requests
// ─────────────────────────────────────────────────────────────

function getSender(msg) { return msg.key.participant || msg.key.remoteJid; }

async function getBotJid(sock) {
    try { return sock.user?.id || sock.authState?.creds?.me?.id || null; } catch { return null; }
}

async function isAdmin(sock, chatId, jid) {
    try {
        const meta = await sock.groupMetadata(chatId);
        const norm = jid.replace(/:\d+@/, '@');
        return meta.participants.some(p => (p.id === jid || p.id.replace(/:\d+@/, '@') === norm) && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch { return false; }
}

module.exports = [
    {
        name: 'listrequests',
        aliases: ['joinreqs', 'pendingreqs', 'joinlist'],
        description: 'List all pending group join requests',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us'))
                return sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });

            try { await sock.sendMessage(chatId, { react: { text: '📋', key: msg.key } }); } catch {}

            try {
                const requests = await sock.groupRequestParticipantsList(chatId);
                if (!requests || requests.length === 0)
                    return sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ No pending join requests\n║\n╚═╝` }, { quoted: msg });

                const items = requests.map((r, i) => `║  ${i + 1}. +${r.jid.replace(/[^0-9]/g, '')}`).join('\n');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  JOIN REQUESTS (${requests.length}) 〕\n║\n${items}\n║\n║ ▸ *${prefix}acceptall* — approve all\n║ ▸ *${prefix}rejectall* — reject all\n║\n╚═╝`,
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ❌ ${e.message || 'Failed to fetch requests'}\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },

    {
        name: 'acceptall',
        aliases: ['approveall', 'acceptreqs'],
        description: 'Accept all pending group join requests',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us'))
                return sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch {}

            try {
                const requests = await sock.groupRequestParticipantsList(chatId);
                if (!requests || requests.length === 0)
                    return sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ No pending requests to accept\n║\n╚═╝` }, { quoted: msg });

                const jids = requests.map(r => r.jid);
                await sock.groupRequestParticipantsUpdate(chatId, jids, 'approve');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ✅ Approved ${jids.length} request${jids.length > 1 ? 's' : ''}\n║\n╚═╝`,
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ❌ ${e.message || 'Failed'}\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },

    {
        name: 'rejectall',
        aliases: ['denyall', 'rejectreqs'],
        description: 'Reject all pending group join requests',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us'))
                return sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });

            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch {}

            try {
                const requests = await sock.groupRequestParticipantsList(chatId);
                if (!requests || requests.length === 0)
                    return sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ No pending requests to reject\n║\n╚═╝` }, { quoted: msg });

                const jids = requests.map(r => r.jid);
                await sock.groupRequestParticipantsUpdate(chatId, jids, 'reject');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ❌ Rejected ${jids.length} request${jids.length > 1 ? 's' : ''}\n║\n╚═╝`,
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ❌ ${e.message || 'Failed'}\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },

    {
        name: 'accept',
        aliases: ['approveone', 'acceptone'],
        description: 'Accept a specific join request by @mention or number',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId   = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us'))
                return sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch {}

            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const numArg    = args.find(a => /^\d+/.test(a));
            let   target    = mentioned[0] || (numArg ? `${numArg.replace(/\D/g, '')}@s.whatsapp.net` : null);

            if (!target) return sock.sendMessage(chatId, {
                text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ *Usage* : ${prefix}accept @mention\n║           ${prefix}accept 254712345678\n║\n╚═╝`,
            }, { quoted: msg });

            try {
                await sock.groupRequestParticipantsUpdate(chatId, [target], 'approve');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ✅ Approved +${target.replace(/[^0-9]/g, '')}\n║\n╚═╝`,
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ❌ ${e.message}\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },

    {
        name: 'reject',
        aliases: ['denyone', 'rejectone'],
        description: 'Reject a specific join request',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId   = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us'))
                return sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });

            try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch {}

            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const numArg    = args.find(a => /^\d+/.test(a));
            let   target    = mentioned[0] || (numArg ? `${numArg.replace(/\D/g, '')}@s.whatsapp.net` : null);

            if (!target) return sock.sendMessage(chatId, {
                text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ *Usage* : ${prefix}reject @mention\n║\n╚═╝`,
            }, { quoted: msg });

            try {
                await sock.groupRequestParticipantsUpdate(chatId, [target], 'reject');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ✅ Rejected +${target.replace(/[^0-9]/g, '')}\n║\n╚═╝`,
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `╔═|〔  JOIN REQUESTS 〕\n║\n║ ▸ ❌ ${e.message}\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },

    {
        name: 'togroupstatus',
        aliases: ['grouplock', 'lockgroup', 'groupunlock'],
        description: 'Toggle group open/locked (join link on/off)',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us'))
                return sock.sendMessage(chatId, { text: `╔═|〔  GROUP STATUS 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
            try { await sock.sendMessage(chatId, { react: { text: '🔒', key: msg.key } }); } catch {}
            try {
                const meta   = await sock.groupMetadata(chatId);
                // Toggle: if currently set to 'announcement' (admin only) switch to not_announcement, else switch to announcement
                const locked = meta.announce === true;
                await sock.groupSettingUpdate(chatId, locked ? 'not_announcement' : 'announcement');
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  GROUP STATUS 〕\n║\n║ ▸ ${locked ? '🔓 Group unlocked — all can send' : '🔒 Group locked — admins only'}\n║\n╚═╝`,
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(chatId, { text: `╔═|〔  GROUP STATUS 〕\n║\n║ ▸ ❌ ${e.message}\n║\n╚═╝` }, { quoted: msg });
            }
        }
    },
];
