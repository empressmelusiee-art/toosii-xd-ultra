const { setBotName } = require('../../lib/botname');

module.exports = {
    name: 'setbotname',
    aliases: ['botname', 'rename'],
    description: 'Change the bot display name',
    category: 'utility',
    ownerOnly: true,
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🏷️', key: msg.key } }); } catch {}
        const { isSudoUser: _ctxSudo, isOwnerUser: _ctxOwner } = ctx || {};
        if (!_ctxSudo && !_ctxOwner) {
            const _cfg = require('../../config');
            const { isSudoNumber: _isSudo } = require('../../lib/sudo-store');
            const _senderNum = (msg.key.participant || msg.key.remoteJid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            const _ownerNum  = (_cfg.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
            const _isCreator = _cfg.CREATORS.includes(_senderNum);
            if (_senderNum !== _ownerNum && !_isSudo(_senderNum) && !_isCreator) {
                return sock.sendMessage(chatId, { text: `╔═|〔  SET BOT NAME 〕\n║\n║ ▸ *Status* : ❌ Owner Only\n║\n╚═╝` }, { quoted: msg });
            }
        }
        const newName = args.join(' ').trim();
        if (!newName) {
            return sock.sendMessage(chatId, { text: `╔═|〔  SET BOT NAME 〕\n║\n║ ▸ *Usage* : ${prefix}setbotname <name>\n║\n╚═╝` }, { quoted: msg });
        }
        setBotName(newName);
        await sock.sendMessage(chatId, { text: `╔═|〔  SET BOT NAME 〕\n║\n║ ▸ *New Name* : ${newName}\n║ ▸ *Status*   : ✅ Updated\n║\n╚═╝` }, { quoted: msg });
    }
};
