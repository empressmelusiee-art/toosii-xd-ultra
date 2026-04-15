const cfg            = require('../../config');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'alive',
    aliases: ['awake','status','online'],
    description: 'Check if the bot is alive and running',
    category: 'utility',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '💚', key: msg.key } }); } catch {}
        const name   = getBotName();
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        // Check each source individually — skip any with >13 digits (LID values)
          // Resolve owner number — creds.json me.id is the real phone JID from pairing
            const _pickOwnerNum = (...extras) => {
                const _tryNum = (raw) => {
                    if (!raw) return '';
                    const n = String(raw).replace(/[^0-9]/g, '');
                    return (n.length >= 7 && n.length <= 13) ? n : '';
                };
                let _credsNum = '';
                try {
                    const _credsPath = require('path').join(__dirname, '../../session/creds.json');
                    const _creds = JSON.parse(require('fs').readFileSync(_credsPath, 'utf8'));
                    const _meId = (_creds?.me?.id || '');
                    if (_meId && !_meId.includes('@lid')) {
                        _credsNum = _tryNum(_meId.split('@')[0].split(':')[0]);
                    }
                } catch (_) {}
                for (const raw of [process.env.OWNER_NUMBER, require('../../config').OWNER_NUMBER, _credsNum, ...extras]) {
                    const n = _tryNum(raw);
                    if (n) return n;
                }
                return '';
            };
          const ownerNum = _pickOwnerNum(global.OWNER_NUMBER, global.OWNER_CLEAN_NUMBER);
          const owner  = ownerNum ? `+${ownerNum}` : 'Unknown';
        const mode   = (process.env.BOT_MODE || cfg.MODE || 'public').toUpperCase();

        const text = [
            `╔═| ●-《  ${name} 》-●`,
            `║`,
            `║ ▸ *Name*     : ${name}`,
            `║ ▸ *Prefix*   : ${prefix || '.'}`,
            `║ ▸ *Owner*    : ${owner}`,
            `║ ▸ *Platform* : Replit`,
            `║ ▸ *Mode*     : ${mode}`,
            `║ ▸ *Uptime*   : ${h}h ${m}m ${s}s`,
            `║ ▸ *Status*   : CONNECTED ✅`,
            `║`,
            `╚═|  ☆ SYSTEM ONLINE  ☆`,
        ].join('\n');

        await sock.sendMessage(chatId, { text }, { quoted: msg });
    }
};
