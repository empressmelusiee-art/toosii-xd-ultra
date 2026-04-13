const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { get, toggle }          = require('../../lib/autoconfig');
const { getBotName }           = require('../../lib/botname');
const config                   = require('../../config');

async function handleAutoDownloadStatus(sock, statusKey, resolvedMessage) {
    try {
        const cfg = get('autodownloadstatus');
        if (!cfg?.enabled) return;
        if (!resolvedMessage) return;

        const imgMsg   = resolvedMessage.imageMessage;
        const vidMsg   = resolvedMessage.videoMessage;
        if (!imgMsg && !vidMsg) return;

        const ownerJid = `${(config.OWNER_NUMBER || '').replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        if (!ownerJid.startsWith('@')) return;

        const syntheticMsg = { key: statusKey, message: resolvedMessage };
        const buf = await downloadMediaMessage(syntheticMsg, 'buffer', {});
        if (!buf?.length) return;

        const sender  = (statusKey.participant || statusKey.remoteJid || 'unknown').split('@')[0].split(':')[0];
        const caption = `╔═|〔  STATUS SAVED 〕\n║\n║ ▸ *From*  : +${sender}\n║ ▸ *Type*  : ${imgMsg ? '🖼️ Image' : '📹 Video'}\n║\n╚═|〔 ${getBotName()} 〕`;

        if (imgMsg) await sock.sendMessage(ownerJid, { image: buf, caption });
        else         await sock.sendMessage(ownerJid, { video: buf, caption });
    } catch {}
}

module.exports = {
    handleAutoDownloadStatus,

    name:        'autodownloadstatus',
    aliases:     ['ads', 'autosave', 'autosavestatus'],
    description: 'Auto-download and save status media to your DM',
    category:    'automation',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  AUTO DOWNLOAD STATUS 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        const cfg = get('autodownloadstatus');
        const now = toggle('autodownloadstatus');
        return sock.sendMessage(chatId, {
            text: `╔═|〔  AUTO DOWNLOAD STATUS 〕\n║\n║ ▸ *State* : ${now ? '✅ Enabled' : '❌ Disabled'}\n║ ▸ *Note*  : Media saved to your DM\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
    }
};
