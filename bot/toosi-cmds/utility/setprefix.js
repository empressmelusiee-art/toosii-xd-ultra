const { setConfig } = require('../../lib/database');

module.exports = {
    name: 'setprefix',
    aliases: ['prefix', 'changeprefix'],
    description: 'Change the bot command prefix',
    category: 'utility',
    ownerOnly: true,
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '✏️', key: msg.key } }); } catch {}
        const { isSudoUser: _ctxSudo, isOwnerUser: _ctxOwner } = ctx || {};
        if (!_ctxSudo && !_ctxOwner) {
            const _cfg = require('../../config');
            const { isSudoNumber: _isSudo } = require('../../lib/sudo-store');
            const _senderNum = (msg.key.participant || msg.key.remoteJid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            const _ownerNum  = (_cfg.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
            const _isCreator = _cfg.CREATORS.includes(_senderNum);
            if (_senderNum !== _ownerNum && !_isSudo(_senderNum) && !_isCreator) {
                return sock.sendMessage(chatId, { text: `╔═|〔  SET PREFIX 〕\n║\n║ ▸ *Status* : ❌ Owner Only\n║\n╚═╝` }, { quoted: msg });
            }
        }
        const newPrefix = args[0];
        if (!newPrefix || newPrefix.length > 3) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  SET PREFIX 〕\n║\n║ ▸ *Usage*   : ${prefix}setprefix <symbol>\n║ ▸ *Example* : ${prefix}setprefix !\n║\n╚═╝`,
            }, { quoted: msg });
        }

        if (typeof globalThis.updatePrefixImmediately === 'function') {
            globalThis.updatePrefixImmediately(newPrefix);
        } else {
            const prefixConfig = {
                prefix: newPrefix,
                isPrefixless: false,
                setAt: new Date().toISOString(),
                timestamp: Date.now(),
            };
            await setConfig('prefix_config', prefixConfig);
            await setConfig('bot_settings', { prefix: newPrefix, isPrefixless: false, prefixSetAt: new Date().toISOString() });
            process.env.PREFIX = newPrefix;
            if (global.botConfig) global.botConfig.PREFIX = newPrefix;
            global.prefix = newPrefix;
            global.CURRENT_PREFIX = newPrefix;
            global.isPrefixless = false;
        }

        await sock.sendMessage(chatId, { text: `╔═|〔  SET PREFIX 〕\n║\n║ ▸ *New Prefix* : ${newPrefix}\n║ ▸ *Status*     : ✅ Updated\n║\n╚═╝` }, { quoted: msg });
    }
};
