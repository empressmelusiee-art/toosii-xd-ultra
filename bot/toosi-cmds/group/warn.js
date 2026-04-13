const { getTarget, resolveDisplay } = require('../../lib/groupUtils');
const fs   = require('fs');
const path = require('path');

const WARN_FILE = path.join(__dirname, '../../data/warnings.json');

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
        name: 'warn',
        aliases: ['warning'],
        description: 'Warn a group member',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  WARN 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
            const target = getTarget(msg, args);
            if (!target) return sock.sendMessage(chatId, { text: `╔═|〔  WARN 〕\n║\n║ ▸ *Usage* : ${prefix}warn @user or reply a message\n║\n╚═╝` }, { quoted: msg });
            const reason  = args.filter(a => !a.startsWith('@')).join(' ').trim() || 'No reason given';
            const display = await resolveDisplay(sock, chatId, target);
            const warns   = loadWarns();
            const key     = getKey(chatId, target);
            warns[key]    = (warns[key] || 0) + 1;
            saveWarns(warns);
            const count   = warns[key];
            const MAX     = 3;
            let extra     = '';
            if (count >= MAX) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [target], 'remove');
                    extra = `\n║ ▸ *Action*  : 🚫 Auto-kicked (${MAX} warns)`;
                    warns[key] = 0;
                    saveWarns(warns);
                } catch {}
            }
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WARN 〕\n║\n║ ▸ *User*    : ${display}\n║ ▸ *Reason*  : ${reason}\n║ ▸ *Warns*   : ${Math.min(count, MAX)}/${MAX}${extra}\n║\n╚═╝`
            }, { quoted: msg });
        }
    },
    {
        name: 'warns',
        aliases: ['warnlist','checkwarn'],
        description: 'Check warnings for a user',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  WARNS 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
            const target = getTarget(msg, args);
            if (!target) return sock.sendMessage(chatId, { text: `╔═|〔  WARNS 〕\n║\n║ ▸ *Usage* : ${prefix}warns @user or reply a message\n║\n╚═╝` }, { quoted: msg });
            const display = await resolveDisplay(sock, chatId, target);
            const warns   = loadWarns();
            const count   = warns[getKey(chatId, target)] || 0;
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WARNS 〕\n║\n║ ▸ *User*  : ${display}\n║ ▸ *Warns* : ${count}/3\n║\n╚═╝`
            }, { quoted: msg });
        }
    },
    {
        name: 'resetwarn',
        aliases: ['clearwarn','unwarn'],
        description: 'Reset warnings for a user',
        category: 'group',
        async execute(sock, msg, args, prefix, ctx) {
            const chatId = msg.key.remoteJid;
            if (!chatId.endsWith('@g.us')) return sock.sendMessage(chatId, { text: `╔═|〔  RESET WARN 〕\n║\n║ ▸ Group only command\n║\n╚═╝` }, { quoted: msg });
            const target = getTarget(msg, args);
            if (!target) return sock.sendMessage(chatId, { text: `╔═|〔  RESET WARN 〕\n║\n║ ▸ *Usage* : ${prefix}resetwarn @user or reply a message\n║\n╚═╝` }, { quoted: msg });
            const display = await resolveDisplay(sock, chatId, target);
            const warns   = loadWarns();
            warns[getKey(chatId, target)] = 0;
            saveWarns(warns);
            await sock.sendMessage(chatId, {
                text: `╔═|〔  RESET WARN 〕\n║\n║ ▸ *User*   : ${display}\n║ ▸ *Status* : ✅ Warnings cleared\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
];
