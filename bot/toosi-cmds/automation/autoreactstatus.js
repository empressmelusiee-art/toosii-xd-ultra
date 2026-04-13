const { get, set } = require('../../lib/autoconfig');
const { getBotName } = require('../../lib/botname');

const DEFAULT_EMOJIS = ['❤️', '🔥', '😍', '👍', '🎉', '💯', '😂', '🥰', '🫶', '✨'];

function getCfg() {
    const c = get('autoreactstatus');
    return {
        enabled : c?.enabled   ?? false,
        mode    : c?.mode      ?? 'fixed',
        emoji   : c?.emoji     ?? '❤️',
        emojis  : Array.isArray(c?.emojis) && c.emojis.length ? c.emojis : [...DEFAULT_EMOJIS],
    };
}
function saveCfg(patch) {
    const cur = getCfg();
    set('autoreactstatus', Object.assign(cur, patch));
}

function pickEmoji(cfg) {
    if (cfg.mode === 'random') {
        const list = cfg.emojis.length ? cfg.emojis : DEFAULT_EMOJIS;
        return list[Math.floor(Math.random() * list.length)];
    }
    return cfg.emoji || '❤️';
}

// ── handler called by index.js for every status@broadcast message ─────────────
async function handleAutoReact(sock, statusKey) {
    try {
        const cfg = getCfg();
        if (!cfg.enabled) return;
        const emoji = pickEmoji(cfg);

        // Resolve the poster's JID to a phone number JID (not LID) so the
        // reaction notification actually reaches them.
        const posterJid = statusKey.participantPn   // already resolved to @s.whatsapp.net
                       || (statusKey.participant && !statusKey.participant.includes('@lid')
                              ? statusKey.participant
                              : null)
                       || statusKey.remoteJid;

        const reactKey = {
            remoteJid  : 'status@broadcast',
            id         : statusKey.id,
            fromMe     : false,
            participant: posterJid,
        };

        // statusJidList is required — it tells WhatsApp whose status this
        // reaction belongs to so the poster receives the notification.
        await sock.sendMessage(
            'status@broadcast',
            { react: { text: emoji, key: reactKey } },
            { statusJidList: [posterJid] }
        );
    } catch {}
}

// ── command ───────────────────────────────────────────────────────────────────
module.exports = {
    handleAutoReact,

    name:        'autolikestatus',
    aliases:     ['als', 'autoreactstatus', 'ars', 'autoreact'],
    description: 'Auto-react to WhatsApp status updates (fixed or random emoji)',
    category:    'automation',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        const botName = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AUTO REACT STATUS 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═|〔 ${botName} 〕`
            }, { quoted: msg });
        }

        const sub = args[0]?.toLowerCase();
        const cfg = getCfg();

        // ── status / no args ──────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            const modeLabel = cfg.mode === 'random'
                ? `🎲 Random  (${cfg.emojis.join(' ')})`
                : `📌 Fixed   → ${cfg.emoji}`;
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  AUTO REACT STATUS 〕`,
                    `║`,
                    `║ ▸ *State* : ${cfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Mode*  : ${modeLabel}`,
                    `║`,
                    `║ ▸ *Usage* :`,
                    `║   ${prefix}als on / off`,
                    `║   ${prefix}als fixed ❤️`,
                    `║   ${prefix}als random`,
                    `║   ${prefix}als emojis 🔥 ❤️ 😍 👍`,
                    `║   ${prefix}als reset`,
                    `║`,
                    `╚═|〔 ${botName} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── on / off ──────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            saveCfg({ enabled: sub === 'on' });
            const now = getCfg();
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  AUTO REACT STATUS 〕`,
                    `║`,
                    `║ ▸ *State* : ${now.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                    `║ ▸ *Mode*  : ${now.mode === 'random' ? `🎲 Random (${now.emojis.join(' ')})` : `📌 Fixed → ${now.emoji}`}`,
                    `║`,
                    `╚═|〔 ${botName} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── fixed <emoji> ─────────────────────────────────────────────────────
        if (sub === 'fixed' || sub === 'emoji') {
            const chosen = args[1] || '❤️';
            saveCfg({ mode: 'fixed', emoji: chosen });
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AUTO REACT STATUS 〕\n║\n║ ▸ *Mode*  : 📌 Fixed\n║ ▸ *Emoji* : ${chosen}\n║\n╚═|〔 ${botName} 〕`
            }, { quoted: msg });
        }

        // ── random ────────────────────────────────────────────────────────────
        if (sub === 'random') {
            saveCfg({ mode: 'random' });
            const now = getCfg();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AUTO REACT STATUS 〕\n║\n║ ▸ *Mode*   : 🎲 Random\n║ ▸ *Emojis* : ${now.emojis.join(' ')}\n║\n╚═|〔 ${botName} 〕`
            }, { quoted: msg });
        }

        // ── emojis <e1> <e2> ... ──────────────────────────────────────────────
        if (sub === 'emojis' || sub === 'list') {
            const list = args.slice(1).filter(Boolean);
            if (!list.length) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  AUTO REACT STATUS 〕\n║\n║ ▸ *Usage* : ${prefix}als emojis 🔥 ❤️ 😍 👍\n║\n╚═|〔 ${botName} 〕`
                }, { quoted: msg });
            }
            saveCfg({ emojis: list, mode: 'random' });
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AUTO REACT STATUS 〕\n║\n║ ▸ *Mode*   : 🎲 Random\n║ ▸ *Emojis* : ${list.join(' ')}\n║\n╚═|〔 ${botName} 〕`
            }, { quoted: msg });
        }

        // ── reset ─────────────────────────────────────────────────────────────
        if (sub === 'reset') {
            saveCfg({ mode: 'fixed', emoji: '❤️', emojis: [...DEFAULT_EMOJIS] });
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AUTO REACT STATUS 〕\n║\n║ ▸ *Reset* : ✅ Defaults restored\n║ ▸ *Mode*  : 📌 Fixed → ❤️\n║\n╚═|〔 ${botName} 〕`
            }, { quoted: msg });
        }

        // ── unknown arg → ignore silently; only toggle when no arg given ─────
        if (sub) return;
        saveCfg({ enabled: !cfg.enabled });
        const now = getCfg();
        return sock.sendMessage(chatId, {
            text: `╔═|〔  AUTO REACT STATUS 〕\n║\n║ ▸ *State* : ${now.enabled ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═|〔 ${botName} 〕`
        }, { quoted: msg });
    }
};
