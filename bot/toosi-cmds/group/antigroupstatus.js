const fs   = require('fs');
const path = require('path');
const { getBotName }   = require('../../lib/botname');
const { isSudoNumber } = require('../../lib/sudo-store');

const CFG_FILE = path.join(__dirname, '../../data/antigroupstatus.json');
let _sock = null;

function loadCfg() {
    try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return {}; }
}
function saveCfg(d) {
    try { fs.writeFileSync(CFG_FILE, JSON.stringify(d, null, 2)); } catch {}
}

/** Bare phone number from any JID format */
function bareNum(jid = '') { return jid.split('@')[0].split(':')[0]; }

/** Default group config */
function defaultGcfg() {
    return { enabled: false, exemptAdmins: true, exemptSudos: true, exempt: [] };
}

/** Per-group exempt check */
async function isExempt(sock, chatId, senderJid, gcfg) {
    const num = bareNum(senderJid);

    // 1. Owner + sudos — only if this group has exemptSudos enabled
    if (gcfg.exemptSudos !== false && isSudoNumber(num)) return true;

    // 2. Custom per-group exempt list (always honoured)
    const exemptList = gcfg.exempt || [];
    if (exemptList.some(e => bareNum(e) === num)) return true;

    // 3. WhatsApp group admins — only if this group has exemptAdmins enabled
    if (gcfg.exemptAdmins !== false) {
        try {
            const meta    = await sock.groupMetadata(chatId);
            const isAdmin = meta.participants.some(
                p => bareNum(p.id) === num && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            if (isAdmin) return true;
        } catch {}
    }

    return false;
}

// ── Event handler registered once at connect ──────────────────────────────────
function setupAntiGroupStatusListener(sock) {
    _sock = sock;
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message?.groupStatusMentionMessage) continue;
            const chatId = msg.key.remoteJid;
            if (!chatId?.endsWith('@g.us')) continue;

            const cfg  = loadCfg();
            const gcfg = cfg[chatId];
            if (!gcfg?.enabled) continue;

            const sender = msg.key.participant || msg.key.remoteJid || '';
            if (await isExempt(sock, chatId, sender, gcfg)) continue;

            try { await sock.sendMessage(chatId, { delete: msg.key }); } catch {}
        }
    });
}

module.exports = {
    setupAntiGroupStatusListener,

    name:        'antigroupstatus',
    aliases:     ['ags', 'antigroupstatus', 'antigrpstatus', 'antistatusgroupmention', 'asgm'],
    description: 'Block group status mentions with per-group exempt control',
    category:    'group',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        _sock = sock;

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *Status* : ❌ Groups only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        const sub    = args[0]?.toLowerCase();
        const sub2   = args[1]?.toLowerCase();
        const cfg    = loadCfg();
        const gcfg   = Object.assign(defaultGcfg(), cfg[chatId] || {});
        if (!Array.isArray(gcfg.exempt)) gcfg.exempt = [];

        const save = () => { cfg[chatId] = gcfg; saveCfg(cfg); };
        const flag = v => v !== false ? '✅ ON' : '❌ OFF';

        // ── status / no args ─────────────────────────────────────────────────
        if (!sub || sub === 'status') {
            const extraList = gcfg.exempt.length
                ? gcfg.exempt.map(e => `║    • +${bareNum(e)}`).join('\n')
                : `║    • none`;
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  ANTI GROUP STATUS 〕`,
                    `║`,
                    `║ ▸ *State*         : ${gcfg.enabled ? '✅ ON' : '❌ OFF'}`,
                    `║ ▸ *Exempt admins* : ${flag(gcfg.exemptAdmins)}`,
                    `║ ▸ *Exempt sudos*  : ${flag(gcfg.exemptSudos)}`,
                    `║ ▸ *Extra exempt*  :`,
                    extraList,
                    `║`,
                    `║ ▸ *Commands* :`,
                    `║   ${prefix}ags on / off`,
                    `║   ${prefix}ags admins on / off`,
                    `║   ${prefix}ags sudos on / off`,
                    `║   ${prefix}ags exempt @user`,
                    `║   ${prefix}ags unexempt @user`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        // ── on / off ──────────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            gcfg.enabled = sub === 'on'; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *State* : ${gcfg.enabled ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── admins on / off ───────────────────────────────────────────────────
        if (sub === 'admins') {
            if (sub2 === 'on' || sub2 === 'off') {
                gcfg.exemptAdmins = sub2 === 'on'; save();
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *Exempt group admins* : ${flag(gcfg.exemptAdmins)}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            // toggle
            gcfg.exemptAdmins = !gcfg.exemptAdmins; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *Exempt group admins* : ${flag(gcfg.exemptAdmins)}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── sudos on / off ────────────────────────────────────────────────────
        if (sub === 'sudos') {
            if (sub2 === 'on' || sub2 === 'off') {
                gcfg.exemptSudos = sub2 === 'on'; save();
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *Exempt owner/sudos* : ${flag(gcfg.exemptSudos)}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            // toggle
            gcfg.exemptSudos = !gcfg.exemptSudos; save();
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *Exempt owner/sudos* : ${flag(gcfg.exemptSudos)}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // ── exempt / unexempt @user ───────────────────────────────────────────
        if (sub === 'exempt' || sub === 'unexempt') {
            const ctx2   = msg.message?.extendedTextMessage?.contextInfo;
            const target = ctx2?.participant || ctx2?.mentionedJid?.[0] || null;
            if (!target) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ Reply to or @mention the user\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            const tNum = bareNum(target);
            if (sub === 'exempt') {
                if (!gcfg.exempt.some(e => bareNum(e) === tNum)) gcfg.exempt.push(target);
                save();
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *Exempted* : +${tNum}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            } else {
                gcfg.exempt = gcfg.exempt.filter(e => bareNum(e) !== tNum);
                save();
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *Removed* : +${tNum}\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
        }

        // ── unknown arg → ignore silently; only toggle when no arg given ─────
        if (sub) return;
        gcfg.enabled = !gcfg.enabled; save();
        return sock.sendMessage(chatId, {
            text: `╔═|〔  ANTI GROUP STATUS 〕\n║\n║ ▸ *State* : ${gcfg.enabled ? '✅ Enabled' : '❌ Disabled'}\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
    }
};
