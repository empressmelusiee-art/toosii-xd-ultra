'use strict';

const { getTarget, resolveDisplay, checkPrivilege } = require('../../lib/groupUtils');
const { getBotName } = require('../../lib/botname');
const fs   = require('fs');
const path = require('path');

const WARN_FILE = path.join(__dirname, '../../data/warnings.json');
const MAX_WARNS = 3;

function loadWarns() {
    try { return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8')); } catch { return {}; }
}
function saveWarns(data) {
    fs.mkdirSync(path.dirname(WARN_FILE), { recursive: true });
    fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
}
function getKey(chatId, jid) { return `${chatId}::${jid.split('@')[0].split(':')[0]}`; }

module.exports = [
    {
        name:        'warn',
        aliases:     ['warning'],
        description: 'Warn a group member — auto-kick at 3 warns (sudo/admin only)',
        category:    'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            try { await sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } }); } catch {}

            if (!chatId.endsWith('@g.us')) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  WARN 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            const { ok } = await checkPrivilege(sock, chatId, msg, ctx);
            if (!ok) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  WARN 〕\n║\n║ ▸ *Status* : ❌ Permission denied\n║ ▸ *Reason* : Sudo users and group admins only\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            const target = getTarget(msg, args);
            if (!target) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  WARN 〕\n║\n║ ▸ *Usage* : ${prefix}warn @user [reason]\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            const reason  = args.filter(a => !a.startsWith('@')).join(' ').trim() || 'No reason given';
            const display = await resolveDisplay(sock, chatId, target);
            const warns   = loadWarns();
            const key     = getKey(chatId, target);
            warns[key]    = (warns[key] || 0) + 1;
            saveWarns(warns);
            const count   = warns[key];
            let extra     = '';
            if (count >= MAX_WARNS) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [target], 'remove');
                    extra = `\n║ ▸ *Action*  : 🚫 Auto-kicked (${MAX_WARNS} warns)`;
                    warns[key] = 0;
                    saveWarns(warns);
                } catch {}
            }
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WARN 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Reason* : ${reason}\n║ ▸ *Warns*  : ${Math.min(count, MAX_WARNS)}/${MAX_WARNS}${extra}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    },
    {
        name:        'warns',
        aliases:     ['warnlist', 'checkwarn'],
        description: 'Check how many warnings a user has',
        category:    'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            try { await sock.sendMessage(chatId, { react: { text: '📋', key: msg.key } }); } catch {}

            if (!chatId.endsWith('@g.us')) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  WARNS 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            const target = getTarget(msg, args);
            if (!target) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  WARNS 〕\n║\n║ ▸ *Usage* : ${prefix}warns @user or reply a message\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            const display = await resolveDisplay(sock, chatId, target);
            const warns   = loadWarns();
            const count   = warns[getKey(chatId, target)] || 0;
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WARNS 〕\n║\n║ ▸ *User*  : ${display}\n║ ▸ *Warns* : ${count}/${MAX_WARNS}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    },
    {
        name:        'resetwarn',
        aliases:     ['clearwarn', 'unwarn'],
        description: 'Reset warnings for a user (sudo/admin only)',
        category:    'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            try { await sock.sendMessage(chatId, { react: { text: '🔄', key: msg.key } }); } catch {}

            if (!chatId.endsWith('@g.us')) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  RESET WARN 〕\n║\n║ ▸ *Status* : ❌ Group only\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            const { ok } = await checkPrivilege(sock, chatId, msg, ctx);
            if (!ok) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  RESET WARN 〕\n║\n║ ▸ *Status* : ❌ Permission denied\n║ ▸ *Reason* : Sudo users and group admins only\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            const target = getTarget(msg, args);
            if (!target) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  RESET WARN 〕\n║\n║ ▸ *Usage* : ${prefix}resetwarn @user or reply a message\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }
            const display = await resolveDisplay(sock, chatId, target);
            const warns   = loadWarns();
            warns[getKey(chatId, target)] = 0;
            saveWarns(warns);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  RESET WARN 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Status* : ✅ Warnings cleared\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
];
