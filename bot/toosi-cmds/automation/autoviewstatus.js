const { get, set, toggle } = require('../../lib/autoconfig');
const { getBotName }       = require('../../lib/botname');

// ── handler called by index.js for every status@broadcast message ─────────────
async function handleAutoView(sock, statusKey) {
    try {
        const cfg = get('autoviewstatus');
        if (!cfg?.enabled) return;
        if (!statusKey?.id) return;

        const readKey = {
            remoteJid  : 'status@broadcast',
            id         : statusKey.id,
            participant: statusKey.participantPn || statusKey.participant || statusKey.remoteJid,
            fromMe     : false,
        };
        await sock.readMessages([readKey]);
    } catch {}
}

// ── command ───────────────────────────────────────────────────────────────────
module.exports = {
    handleAutoView,

    name:        'autoviewstatus',
    aliases:     ['avs', 'autoview', 'autostatus'],
    description: 'Auto-view (mark as seen) all WhatsApp statuses',
    category:    'automation',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const botName = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AUTO VIEW STATUS 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const sub = args[0]?.toLowerCase();
        const cfg = get('autoviewstatus');

        // ── status / no args ──────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  AUTO VIEW STATUS 〕`,
                    `║`,
                    `║ ▸ *State* : ${cfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Note*  : Bot silently marks all statuses as viewed`,
                    `║`,
                    `║ ▸ *Usage* :`,
                    `║   ${prefix}avs on / off`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── on / off ──────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            const enabled = sub === 'on';
            const data = get('autoviewstatus');
            data.enabled = enabled;
            set('autoviewstatus', data);
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  AUTO VIEW STATUS 〕`,
                    `║`,
                    `║ ▸ *State* : ${enabled ? '✅ Enabled' : '❌ Disabled'}`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── unknown arg → ignore silently; only toggle when no arg given ─────
        if (sub) return;
        const now = toggle('autoviewstatus');
        return sock.sendMessage(chatId, {
            text: `╔═|〔  AUTO VIEW STATUS 〕\n║\n║ ▸ *State* : ${now ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═╝`
        }, { quoted: msg });
    }
};
