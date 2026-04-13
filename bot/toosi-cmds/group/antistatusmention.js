const fs   = require('fs');
const path = require('path');
const { getBotName }         = require('../../lib/botname');
const { resolveDisplayWithName } = require('../../lib/groupUtils');
const { OWNER_NUMBER }       = require('../../config');

const CFG_FILE  = path.join(__dirname, '../../data/antistatusmention.json');
const WARN_FILE = path.join(__dirname, '../../data/warnings.json');

// ── helpers ───────────────────────────────────────────────────────────────────
function loadCfg() {
    try {
        const d = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'));
        if (typeof d.enabled === 'boolean' && !d['@migrated']) return {};
        return d;
    } catch { return {}; }
}
function saveCfg(d) {
    try { fs.writeFileSync(CFG_FILE, JSON.stringify(d, null, 2)); } catch {}
}
function loadWarns() {
    try { return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8')); } catch { return {}; }
}
function saveWarns(d) {
    fs.mkdirSync(path.dirname(WARN_FILE), { recursive: true });
    fs.writeFileSync(WARN_FILE, JSON.stringify(d, null, 2));
}
function warnKey(chatId, jid) {
    return `${chatId}::${jid.split('@')[0].split(':')[0]}`;
}

// ── action executor ───────────────────────────────────────────────────────────
async function _deleteMsg(sock, chatId, msgKey) {
    // Build an explicit delete key — participant must be set for group messages
    const deleteKey = {
        remoteJid:   chatId,
        fromMe:      false,
        id:          msgKey.id,
        participant: msgKey.participant || msgKey.remoteJid,
    };
    await sock.sendMessage(chatId, { delete: deleteKey });
}

async function _doAction(sock, msg, chatId, senderJid, display, action, botName) {
    const WARN_MAX = 3;

    // Always try to delete the status-mention message; track success
    let deleted = false;
    try {
        await _deleteMsg(sock, chatId, msg.key);
        deleted = true;
    } catch (e) {
        console.error(`[ASM] delete failed: ${e.message}`);
    }

    if (action === 'delete') {
        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  ANTI STATUS MENTION 〕`,
                `║`,
                `║ ▸ *User*   : ${display}`,
                `║ ▸ *Action* : ${deleted ? '🗑️ Message deleted' : '❌ Delete failed (bot not admin?)'}`,
                `║ ▸ *Reason* : No status mentions allowed`,
                `║`,
                `╚═|〔 ${botName} 〕`,
            ].join('\n')
        });
        return;
    }

    if (action === 'warn') {
        const warns = loadWarns();
        const key   = warnKey(chatId, senderJid);
        warns[key]  = (warns[key] || 0) + 1;
        saveWarns(warns);
        const count = warns[key];
        let extra   = '';
        if (count >= WARN_MAX) {
            try {
                await sock.groupParticipantsUpdate(chatId, [senderJid], 'remove');
                extra = `\n║ ▸ *Auto*   : 🚫 Kicked (${WARN_MAX}/${WARN_MAX} warns)`;
                warns[key] = 0;
                saveWarns(warns);
            } catch {}
        }
        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  ANTI STATUS MENTION 〕`,
                `║`,
                `║ ▸ *User*   : ${display}`,
                `║ ▸ *Action* : ⚠️ Warned`,
                `║ ▸ *Warns*  : ${Math.min(count, WARN_MAX)}/${WARN_MAX}`,
                `║ ▸ *Reason* : Status mention in group` + extra,
                `║`,
                `╚═|〔 ${botName} 〕`,
            ].join('\n')
        });
        return;
    }

    if (action === 'kick') {
        let kicked = false;
        try {
            await sock.groupParticipantsUpdate(chatId, [senderJid], 'remove');
            kicked = true;
        } catch {}
        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  ANTI STATUS MENTION 〕`,
                `║`,
                `║ ▸ *User*   : ${display}`,
                `║ ▸ *Action* : ${kicked ? '🚫 Kicked' : '❌ Kick failed (bot not admin?)'}`,
                `║ ▸ *Reason* : Status mention in group`,
                `║`,
                `╚═|〔 ${botName} 〕`,
            ].join('\n')
        });
        return;
    }
}

// ── Exported handler (called by index.js for every groupStatusMentionMessage) ─
async function handleStatusMention(sock, msg) {
    try {
        const chatId = msg.key.remoteJid;
        if (!chatId?.endsWith('@g.us')) return;

        const gsm = msg.message?.groupStatusMentionMessage;
        if (!gsm) return;

        const cfg  = loadCfg();
        const gcfg = cfg[chatId];
        if (!gcfg?.enabled) return;

        const action    = gcfg.action || 'delete';
        const botName   = getBotName();
        const senderJid = msg.key.participant || msg.key.remoteJid || '';
        const display   = await resolveDisplayWithName(sock, chatId, senderJid, msg.pushName || null)
            .catch(() => `+${senderJid.split('@')[0].split(':')[0]}`);

        await _doAction(sock, msg, chatId, senderJid, display, action, botName);
    } catch {}
}

// ── Command handler ───────────────────────────────────────────────────────────
module.exports = {
    handleStatusMention,

    name:        'antistatusmention',
    aliases:     ['asm', 'statusmention'],
    description: 'Auto-delete/warn/kick when someone shares a status mention in the group',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        const botName = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser && !ctx?.isGroupAdmin) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI STATUS MENTION 〕\n║\n║ ▸ *Status* : ❌ Admins/Owner only\n║\n╚═|〔 ${botName} 〕`
            }, { quoted: msg });
        }
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI STATUS MENTION 〕\n║\n║ ▸ *Status* : ❌ Groups only\n║\n╚═|〔 ${botName} 〕`
            }, { quoted: msg });
        }

        const sub  = args[0]?.toLowerCase();
        const cfg  = loadCfg();
        const gcfg = cfg[chatId] || { enabled: false, action: 'delete' };

        const actionLabel = (a) => a === 'kick' ? '🚫 Kick' : a === 'warn' ? '⚠️ Warn' : '🗑️ Delete';

        // ── status / no args ──────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ANTI STATUS MENTION 〕`,
                    `║`,
                    `║ ▸ *State*  : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Action* : ${actionLabel(gcfg.action || 'delete')}`,
                    `║`,
                    `║ ▸ *Usage*  :`,
                    `║   ${prefix}asm on / off`,
                    `║   ${prefix}asm delete`,
                    `║   ${prefix}asm warn`,
                    `║   ${prefix}asm kick`,
                    `║`,
                    `╚═|〔 ${botName} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── on / off ──────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            gcfg.enabled = sub === 'on';
            cfg[chatId]  = gcfg;
            saveCfg(cfg);
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ANTI STATUS MENTION 〕`,
                    `║`,
                    `║ ▸ *State*  : ${gcfg.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                    `║ ▸ *Action* : ${actionLabel(gcfg.action || 'delete')}`,
                    `║`,
                    `╚═|〔 ${botName} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── set action ────────────────────────────────────────────────────────
        if (sub === 'delete' || sub === 'warn' || sub === 'kick' || sub === 'remove') {
            gcfg.action = (sub === 'remove') ? 'kick' : sub;
            cfg[chatId] = gcfg;
            saveCfg(cfg);
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ANTI STATUS MENTION 〕`,
                    `║`,
                    `║ ▸ *State*  : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Action* : ${actionLabel(gcfg.action)} ✅ Set`,
                    `║`,
                    `╚═|〔 ${botName} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── unknown sub — ignore silently ─────────────────────────────────────
        return;
    }
};
