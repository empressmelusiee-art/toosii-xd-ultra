/**
 * antigroupmention.js
 * Detects and acts when someone @-mentions a foreign WhatsApp group
 * inside this group (cross-group spam / cross-promotion).
 *
 * Trigger: contextInfo.groupMentions contains a group JID that is NOT
 *          the current group — i.e., someone tagged an outside group.
 *
 * Actions: delete | warn (auto-kick at 3) | kick
 * Config : per-group, stored in data/antigroupmention.json
 */

const fs   = require('fs');
const path = require('path');
const { getBotName }             = require('../../lib/botname');
const { isSudoNumber, getPhoneFromLid } = require('../../lib/sudo-store');
const { resolveDisplayWithName } = require('../../lib/groupUtils');
const { registerBotDelete }      = require('../../lib/bot-delete-guard');

const CFG_FILE  = path.join(__dirname, '../../data/antigroupmention.json');
const WARN_FILE = path.join(__dirname, '../../data/warnings.json');

const WARN_MAX = 3;

// ── helpers ───────────────────────────────────────────────────────────────────
function bareNum(jid = '') { return jid.split('@')[0].split(':')[0]; }

function loadCfg()  { try { return JSON.parse(fs.readFileSync(CFG_FILE,  'utf8')); } catch { return {}; } }
function saveCfg(d) { try { fs.mkdirSync(path.dirname(CFG_FILE),  { recursive: true }); fs.writeFileSync(CFG_FILE,  JSON.stringify(d, null, 2)); } catch {} }

function loadWarns()  { try { return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8')); } catch { return {}; } }
function saveWarns(d) { try { fs.mkdirSync(path.dirname(WARN_FILE), { recursive: true }); fs.writeFileSync(WARN_FILE, JSON.stringify(d, null, 2)); } catch {} }

function warnKey(chatId, jid) { return `${chatId}::${bareNum(jid)}`; }
function defaultGcfg() { return { enabled: false, action: 'delete', exemptAdmins: true, exemptSudos: true }; }

// ── scan message for external group mentions ──────────────────────────────────
const MSG_TYPES = [
    'extendedTextMessage','imageMessage','videoMessage','audioMessage',
    'documentMessage','stickerMessage','buttonsMessage','templateMessage',
    'listMessage','groupMentionedMessage',
];

function getContextInfo(msg) {
    const m = msg.message;
    if (!m) return null;
    for (const t of MSG_TYPES) {
        if (m[t]?.contextInfo) return m[t].contextInfo;
    }
    const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message;
    if (inner) for (const t of MSG_TYPES) { if (inner[t]?.contextInfo) return inner[t].contextInfo; }
    return null;
}

/**
 * Returns true if the message @-mentions a group that is NOT the current chat.
 * This covers the WhatsApp "tag a group" feature (groupMentions array) and
 * the direct groupMentionedMessage message type.
 */
function hasExternalGroupMention(msg, chatId) {
    const m = msg.message;
    if (!m) return false;

    // Direct groupMentionedMessage (someone forwarded/tagged a group by name)
    if (m.groupMentionedMessage) return true;

    const ctx = getContextInfo(msg);
    if (!ctx) return false;

    // groupMentions is an array of { groupJid, groupSubject }
    const gms = ctx.groupMentions || [];
    if (gms.some(gm => gm.groupJid && gm.groupJid !== chatId)) return true;

    // mentionedJid includes a foreign group JID (@g.us)
    const jids = ctx.mentionedJid || [];
    if (jids.some(j => j.endsWith('@g.us') && j !== chatId)) return true;

    return false;
}

// ── resolve sender phone (LID-safe) ──────────────────────────────────────────
async function resolvePhone(sock, rawJid) {
    const num   = bareNum(rawJid);
    const isLid = rawJid.endsWith('@lid');
    if (!isLid) return num;
    const cached = getPhoneFromLid(num);
    if (cached) return String(cached).replace(/[^0-9]/g, '');
    if (sock?.signalRepository?.lidMapping?.getPNForLID) {
        try {
            for (const fmt of [rawJid, `${num}@lid`]) {
                const pn = await sock.signalRepository.lidMapping.getPNForLID(fmt);
                if (pn) return String(pn).replace(/[^0-9]/g, '');
            }
        } catch {}
    }
    return num;
}

// ── exemption check ───────────────────────────────────────────────────────────
async function isExempt(sock, chatId, senderJid, gcfg) {
    const rawNum  = bareNum(senderJid);
    const realNum = await resolvePhone(sock, senderJid);

    if (gcfg.exemptSudos !== false && (isSudoNumber(realNum) || isSudoNumber(rawNum))) return true;

    if (gcfg.exemptAdmins !== false) {
        try {
            const meta      = await sock.groupMetadata(chatId);
            const bareJid   = senderJid.replace(/:[\d]+@/, '@');
            const rawDomain = senderJid.split('@')[1] || '';
            const hit       = meta.participants.find(p => {
                if (!p.admin) return false;
                const pId     = p.id || '';
                const pBare   = pId.replace(/:[\d]+@/, '@');
                const pNum    = bareNum(pId);
                const pDomain = pId.split('@')[1] || '';
                return pId === senderJid || pBare === bareJid ||
                    (pNum === rawNum && rawNum.length >= 5 && pDomain === rawDomain) ||
                    (realNum && pNum === realNum && realNum.length >= 5 && pDomain === 's.whatsapp.net');
            });
            if (hit) return true;
        } catch {}
    }
    return false;
}

// ── event listener ────────────────────────────────────────────────────────────
const _agmRegistered = new WeakSet();

function setupAntiGroupMentionListener(sock) {
    if (_agmRegistered.has(sock)) return;
    _agmRegistered.add(sock);
    // Reset all groups to OFF on every bot startup
    try {
        const cfg = loadCfg();
        let changed = false;
        for (const chatId of Object.keys(cfg)) {
            if (cfg[chatId].enabled) { cfg[chatId].enabled = false; changed = true; }
        }
        if (changed) saveCfg(cfg);
    } catch {}


    const startedAt = Math.floor(Date.now() / 1000);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message) continue;
            if (msg.key.fromMe) continue;

            const msgTs = Number(msg.messageTimestamp || 0);
            if (msgTs && msgTs < startedAt - 5) continue;

            const chatId = msg.key.remoteJid;
            if (!chatId?.endsWith('@g.us')) continue;

            const cfg  = loadCfg();
            const gcfg = cfg[chatId];
            if (gcfg?.enabled !== true) continue;

            if (!hasExternalGroupMention(msg, chatId)) continue;

            const sender  = msg.key.participant || msg.key.remoteJid || '';
            if (await isExempt(sock, chatId, sender, gcfg)) continue;

            // Re-check enabled after await — user may have turned AGM off in the meantime
            if (loadCfg()[chatId]?.enabled !== true) continue;

            const action  = gcfg.action || 'delete';
            const botName = getBotName();
            const display = await resolveDisplayWithName(sock, chatId, sender, msg.pushName || null)
                .catch(() => `+${bareNum(sender)}`);

            // Register before deleting so antidelete ignores this
            registerBotDelete(msg.key.id);
            try { await sock.sendMessage(chatId, { delete: msg.key }); } catch {}

            if (action === 'delete') {
                await sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  ANTI GROUP MENTION 〕`,
                        `║`,
                        `║ ▸ *User*   : ${display}`,
                        `║ ▸ *Action* : 🗑️ Message deleted`,
                        `║ ▸ *Reason* : External group mention not allowed`,
                        `║`,
                        `╚═╝`,
                    ].join('\n')
                });

            } else if (action === 'warn') {
                const warns = loadWarns();
                const key   = warnKey(chatId, sender);
                warns[key]  = (warns[key] || 0) + 1;
                const count = warns[key];
                let extra   = '';
                if (count >= WARN_MAX) {
                    try {
                        await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
                        extra = `\n║ ▸ *Auto*   : 🚫 Kicked (${WARN_MAX}/${WARN_MAX} warns)`;
                        warns[key] = 0;
                    } catch {}
                }
                saveWarns(warns);
                await sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  ANTI GROUP MENTION 〕`,
                        `║`,
                        `║ ▸ *User*   : ${display}`,
                        `║ ▸ *Action* : ⚠️ Warned`,
                        `║ ▸ *Warns*  : ${Math.min(count, WARN_MAX)}/${WARN_MAX}`,
                        `║ ▸ *Reason* : External group mention` + extra,
                        `║`,
                        `╚═╝`,
                    ].join('\n')
                });

            } else if (action === 'kick') {
                let kicked = false;
                try {
                    await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
                    kicked = true;
                } catch {}
                await sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  ANTI GROUP MENTION 〕`,
                        `║`,
                        `║ ▸ *User*   : ${display}`,
                        `║ ▸ *Action* : ${kicked ? '🚫 Kicked' : '❌ Kick failed (bot not admin?)'}`,
                        `║ ▸ *Reason* : External group mention`,
                        `║`,
                        `╚═╝`,
                    ].join('\n')
                });
            }
        }
    });
}

// ── command ───────────────────────────────────────────────────────────────────
module.exports = {
    setupAntiGroupMentionListener,

    name:        'antigroupmention',
    aliases:     ['agm', 'antigm'],
    description: 'Delete/warn/kick when someone @-mentions an external group inside this group',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        const botName = getBotName();
        const flag    = v => v !== false ? '✅ ON' : '❌ OFF';
        const aIcon   = a => a === 'kick' ? '🚫 Kick' : a === 'warn' ? '⚠️ Warn' : '🗑️ Delete';

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser && !ctx?.isGroupAdmin) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP MENTION 〕\n║\n║ ▸ *Status* : ❌ Admins/Owner only\n║\n╚═╝`
            }, { quoted: msg });
        }
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP MENTION 〕\n║\n║ ▸ *Status* : ❌ Groups only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const sub  = args[0]?.toLowerCase();
        const sub2 = args[1]?.toLowerCase();
        const cfg  = loadCfg();
        const gcfg = Object.assign(defaultGcfg(), cfg[chatId] || {});
        const save = () => { cfg[chatId] = gcfg; saveCfg(cfg); };

        // ── status / no args ──────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ANTI GROUP MENTION 〕`,
                    `║`,
                    `║ ▸ *State*         : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Action*        : ${aIcon(gcfg.action)}`,
                    `║ ▸ *Exempt admins* : ${flag(gcfg.exemptAdmins)}`,
                    `║ ▸ *Exempt sudos*  : ${flag(gcfg.exemptSudos)}`,
                    `║`,
                    `║ ▸ *Usage* :`,
                    `║   ${prefix}agm on / off`,
                    `║   ${prefix}agm delete / warn / kick`,
                    `║   ${prefix}agm admins on / off`,
                    `║   ${prefix}agm sudos on / off`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── on / off ──────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            gcfg.enabled = sub === 'on'; save();
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ANTI GROUP MENTION 〕`,
                    `║`,
                    `║ ▸ *State*  : ${gcfg.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                    `║ ▸ *Action* : ${aIcon(gcfg.action)}`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── action ────────────────────────────────────────────────────────────
        if (['delete', 'warn', 'kick', 'remove'].includes(sub)) {
            gcfg.action = (sub === 'remove') ? 'kick' : sub; save();
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ANTI GROUP MENTION 〕`,
                    `║`,
                    `║ ▸ *Action* : ${aIcon(gcfg.action)} ✅ Set`,
                    `║`,
                    `╚═╝`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── admins on/off ─────────────────────────────────────────────────────
        if (sub === 'admins') {
            gcfg.exemptAdmins = sub2 === 'on' ? true : sub2 === 'off' ? false : !gcfg.exemptAdmins;
            save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP MENTION 〕\n║\n║ ▸ *Exempt admins* : ${flag(gcfg.exemptAdmins)}\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── sudos on/off ──────────────────────────────────────────────────────
        if (sub === 'sudos') {
            gcfg.exemptSudos = sub2 === 'on' ? true : sub2 === 'off' ? false : !gcfg.exemptSudos;
            save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP MENTION 〕\n║\n║ ▸ *Exempt sudos* : ${flag(gcfg.exemptSudos)}\n║\n╚═╝`
            }, { quoted: msg });
        }

        // ── unknown subcommand — ignore silently ──────────────────────────────
        return;
    }
};
