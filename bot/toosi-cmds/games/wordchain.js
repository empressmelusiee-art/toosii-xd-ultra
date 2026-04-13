'use strict';
// ─────────────────────────────────────────────────────────────
//  Word Chain Game — each word must start with last letter of previous
// ─────────────────────────────────────────────────────────────

const wcgGames = new Map();

function getSender(msg)  { return msg.key.participant || msg.key.remoteJid; }
function shortNum(jid)   { return jid.replace(/[^0-9]/g, '').slice(-6); }

// ── Common English word dictionary (~800 words, no API needed) ─
const WORDS = new Set(`able about above across act add admit adult afraid after again age ago ahead aim air all allow already also always among and animal another answer any area around ask away back ball bank base bear beat become before begin behind believe best better beyond big black body book born both break bring build business buy call came can card care carry case cat cause central chair chance change child choice city claim clear close come common consider control could country cover cut dark decide deep describe design determine die different direct discuss distance dream drive drop earth easy effort either else end enough even event ever every example expect face fact fail fall family far fast feel few field fight fill find follow food force form full future game give goal good great grew group grow hand happen hard have head hear help here high hold home hope house idea imagine important include increase inside interest involve island issue itself jump keep kind know large last later lead learn left less level life like list listen little local long look love low major make many matter mean measure might mind moment money month move much music name nation natural need never next night note nothing notice number offer often only open order other over own part past people percent person picture place plan plant play point policy popular position power practice present pretty probably problem prove public put reach ready real reason receive recent record reduce relate remain result road rock role rule run same seem series set seven share short show sign simple since size slow small some song sort speak spend stand stay still stop study success such summer surface system take talk team theory thing think though three through time today together told too took toward tree true try turn under until upon use usually very view visit voice walk want watch water way week well went while white without world would write year young`.split(' '));

const AI_JID = 'AI@s.whatsapp.net';

function getAIWord(letter, used) {
    const candidates = [...WORDS].filter(w => w[0] === letter && !used.has(w));
    return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

function isValidWord(word, lastLetter, used) {
    if (!word || word.length < 2) return { ok: false, reason: 'Word too short (min 2 letters)' };
    if (word[0] !== lastLetter) return { ok: false, reason: `Must start with *${lastLetter.toUpperCase()}*` };
    if (used.has(word)) return { ok: false, reason: 'Word already used!' };
    if (!/^[a-z]+$/.test(word)) return { ok: false, reason: 'Only letters allowed' };
    return { ok: true };
}

async function sendTurn(sock, chatId, g, prefix) {
    const cur = g.players[g.currentIdx];
    const isAI = cur === AI_JID;
    const lastLetter = g.currentWord.slice(-1).toUpperCase();

    if (isAI) {
        const aiWord = getAIWord(g.currentWord.slice(-1), g.used);
        if (!aiWord) {
            // AI loses
            const sorted = [...g.players.filter(p => p !== AI_JID)].sort((a, b) => (g.scores[b] || 0) - (g.scores[a] || 0));
            wcgGames.delete(chatId);
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ 🤖 AI can't find a word starting with *${lastLetter}*!\n║ ▸ 🏆 Players win!\n║\n╚═╝`,
                mentions: sorted,
            });
        }
        g.used.add(aiWord);
        g.scores[AI_JID] = (g.scores[AI_JID] || 0) + 1;
        g.currentWord = aiWord;
        g.currentIdx = (g.currentIdx + 1) % g.players.length;
        const nextPlayer = g.players[g.currentIdx];
        const nextLetter = aiWord.slice(-1).toUpperCase();
        await sock.sendMessage(chatId, {
            text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ 🤖 AI: *${aiWord.toUpperCase()}*\n║ ▸ Next letter: *${nextLetter}*\n║\n║ ▸ @${shortNum(nextPlayer)}'s turn!\n║ ▸ Send a word starting with *${nextLetter}*\n║\n╚═╝`,
            mentions: [nextPlayer],
        });
        return;
    }

    await sock.sendMessage(chatId, {
        text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Current word: *${g.currentWord.toUpperCase()}*\n║ ▸ Next letter: *${lastLetter}*\n║\n║ ▸ @${shortNum(cur)}'s turn!\n║ ▸ Type a word starting with *${lastLetter}*\n║\n╚═╝`,
        mentions: [cur],
    });
}

module.exports = [
    {
        name: 'wcg',
        aliases: ['wordchain', 'wchain'],
        description: 'Start a Word Chain Game',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us'))
                return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });

            try { await sock.sendMessage(chatId, { react: { text: '🔤', key: msg.key } }); } catch {}

            if (wcgGames.has(chatId))
                return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Game already running\n║ ▸ Use *${prefix}wcgend* to end it\n║\n╚═╝` }, { quoted: msg });

            const sender  = getSender(msg);
            const vsAI    = args.join(' ').toLowerCase().includes('ai');

            const players = [sender];
            const scores  = { [sender]: 0 };
            if (vsAI) {
                players.push(AI_JID);
                scores[AI_JID] = 0;
            }

            wcgGames.set(chatId, {
                host: sender, players, scores,
                used: new Set(), currentWord: '',
                currentIdx: 0, started: false, vsAI,
                timeout: setTimeout(() => {
                    wcgGames.delete(chatId);
                    sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Game expired (idle)\n║\n╚═╝` }).catch(() => {});
                }, 15 * 60 * 1000),
            });

            const extra = vsAI ? '\n║ ▸ You vs 🤖 AI!' : `\n║ ▸ Others: type *${prefix}wcgjoin* to join!`;
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ @${shortNum(sender)} started Word Chain!${extra}\n║ ▸ Host: *${prefix}wcgbegin* to start\n║\n║ ▸ Rules: Each word must start with\n║   the last letter of the previous word\n║\n╚═╝`,
                mentions: [sender],
            }, { quoted: msg });
        }
    },

    {
        name: 'wcgjoin',
        aliases: ['joinwcg', 'joinwordchain'],
        description: 'Join a waiting Word Chain Game',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const g = wcgGames.get(chatId);

            if (!g) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ No game waiting. Use *${prefix}wcg*\n║\n╚═╝` }, { quoted: msg });
            if (g.started) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Game already started!\n║\n╚═╝` }, { quoted: msg });
            if (g.players.includes(sender)) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ You already joined!\n║\n╚═╝` }, { quoted: msg });

            g.players.push(sender);
            g.scores[sender] = 0;

            await sock.sendMessage(chatId, {
                text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ @${shortNum(sender)} joined! (${g.players.filter(p => p !== AI_JID).length} players)\n║ ▸ Host: *${prefix}wcgbegin* to start\n║\n╚═╝`,
                mentions: [sender],
            }, { quoted: msg });
        }
    },

    {
        name: 'wcgbegin',
        aliases: ['beginwcg', 'startwcg'],
        description: 'Start the Word Chain Game (host only)',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const g = wcgGames.get(chatId);

            if (!g) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ No game found. Use *${prefix}wcg*\n║\n╚═╝` }, { quoted: msg });
            if (g.started) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Already started!\n║\n╚═╝` }, { quoted: msg });
            if (sender !== g.host) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Only the host can start\n║\n╚═╝` }, { quoted: msg });
            const humanPlayers = g.players.filter(p => p !== AI_JID);
            if (humanPlayers.length < (g.vsAI ? 1 : 2)) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Need at least 2 players\n║\n╚═╝` }, { quoted: msg });

            // Pick a random starting word
            const starters = [...WORDS].filter(w => w.length >= 3);
            const startWord = starters[Math.floor(Math.random() * starters.length)];
            g.currentWord = startWord;
            g.used.add(startWord);
            g.started = true;

            const playerList = g.players.map(p => p === AI_JID ? '🤖 AI' : `@${shortNum(p)}`).join(', ');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ 🔤 Game started!\n║ ▸ Players: ${playerList}\n║\n║ ▸ Starting word: *${startWord.toUpperCase()}*\n║ ▸ Next letter: *${startWord.slice(-1).toUpperCase()}*\n║\n╚═╝`,
                mentions: g.players.filter(p => p !== AI_JID),
            }, { quoted: msg });

            await sendTurn(sock, chatId, g, prefix);
        }
    },

    {
        name: 'wcgscores',
        aliases: ['wordscores', 'wcgscore'],
        description: 'Show Word Chain Game scores',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const g = wcgGames.get(chatId);
            if (!g) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ No active game\n║\n╚═╝` }, { quoted: msg });
            const sorted = [...g.players].sort((a, b) => (g.scores[b] || 0) - (g.scores[a] || 0));
            const board  = sorted.map((p, i) => `║  ${['🥇','🥈','🥉'][i] || `${i+1}.`} ${p === AI_JID ? '🤖 AI' : `@${shortNum(p)}`} — ${g.scores[p] || 0} words`).join('\n');
            const cur    = g.players[g.currentIdx];
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WORD CHAIN 〕\n║\n${board}\n║\n║ ▸ Current word: *${(g.currentWord || '—').toUpperCase()}*\n║ ▸ Turn: ${cur === AI_JID ? '🤖 AI' : `@${shortNum(cur)}`}\n║\n╚═╝`,
                mentions: g.players.filter(p => p !== AI_JID),
            }, { quoted: msg });
        }
    },

    {
        name: 'wcgend',
        aliases: ['endwcg', 'stopwcg'],
        description: 'End the Word Chain Game',
        category: 'games',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const sender = getSender(msg);
            const g = wcgGames.get(chatId);
            if (!g) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ No active game\n║\n╚═╝` }, { quoted: msg });
            if (sender !== g.host && !ctx?.isOwner?.()) return sock.sendMessage(chatId, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Only host or owner can end\n║\n╚═╝` }, { quoted: msg });

            const sorted = [...g.players].sort((a, b) => (g.scores[b] || 0) - (g.scores[a] || 0));
            const winner = sorted[0];
            const board  = sorted.map((p, i) => `║  ${['🥇','🥈','🥉'][i] || `${i+1}.`} ${p === AI_JID ? '🤖 AI' : `@${shortNum(p)}`} — ${g.scores[p] || 0} words`).join('\n');

            clearTimeout(g.timeout);
            wcgGames.delete(chatId);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ Game ended!\n║\n║ ▸ 🏆 Winner: ${winner === AI_JID ? '🤖 AI' : `@${shortNum(winner)}`}\n║\n${board}\n║\n╚═╝`,
                mentions: g.players.filter(p => p !== AI_JID),
            }, { quoted: msg });
        }
    },

    // ── Word submission handler ───────────────────────────────
    {
        name: '_wcgword',
        hidden: true,
        category: 'games',
        async handleWord(sock, msg, prefix) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us')) return false;
            const g = wcgGames.get(chatId);
            if (!g || !g.started) return false;

            const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();
            if (!text || text.startsWith('.') || text.startsWith('/') || text.includes(' ')) return false;

            const sender = getSender(msg);
            if (sender !== g.players[g.currentIdx]) return false;
            if (sender === AI_JID) return false;

            const lastLetter = g.currentWord.slice(-1);
            const { ok, reason } = isValidWord(text, lastLetter, g.used);

            if (!ok) {
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ ❌ @${shortNum(sender)}: ${reason}\n║ ▸ Try again! Start with *${lastLetter.toUpperCase()}*\n║\n╚═╝`,
                    mentions: [sender],
                }, { quoted: msg });
                return true;
            }

            g.used.add(text);
            g.scores[sender] = (g.scores[sender] || 0) + 1;
            g.currentWord = text;
            g.currentIdx  = (g.currentIdx + 1) % g.players.length;

            const nextLetter = text.slice(-1).toUpperCase();
            const nextPlayer = g.players[g.currentIdx];

            try { await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } }); } catch {}

            await sendTurn(sock, chatId, g, prefix);
            return true;
        }
    },
];

// Standalone .w command for word chain submissions
module.exports.push({
    name: 'w',
    aliases: ['word', 'submitword'],
    description: 'Submit a word in Word Chain Game',
    category: 'games',
    async execute(sock, msg, args, prefix, ctx) {
        const handler = module.exports.find(c => c.name === '_wcgword');
        if (handler) {
            const word = args[0]?.toLowerCase();
            if (!word) return sock.sendMessage(msg.key.remoteJid, { text: `╔═|〔  WORD CHAIN 〕\n║\n║ ▸ *Usage* : ${prefix}w <word>\n║\n╚═╝` }, { quoted: msg });
            const fakemsg = Object.assign({}, msg, { message: { conversation: word } });
            await handler.handleWord(sock, fakemsg, prefix);
        }
    }
});
