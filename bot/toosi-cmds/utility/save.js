'use strict';

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getBotName } = require('../../lib/botname');

const H = '╔═|〔  💾 SAVE STATUS 〕';
const F = () => `╚═|〔 ${getBotName()} 〕`;

function unwrapViewOnce(msg) {
    return msg?.viewOnceMessageV2?.message
        || msg?.viewOnceMessageV2Extension?.message
        || msg?.viewOnceMessage?.message
        || msg;
}

function detectMedia(msg) {
    const unwrapped = unwrapViewOnce(msg);
    if (unwrapped?.imageMessage) return { type: 'image', inner: unwrapped };
    if (unwrapped?.videoMessage) return { type: 'video', inner: unwrapped };
    if (unwrapped?.audioMessage) return { type: 'audio', inner: unwrapped };
    if (unwrapped?.stickerMessage) return { type: 'sticker', inner: unwrapped };
    if (unwrapped?.documentMessage) return { type: 'document', inner: unwrapped };
    return null;
}

module.exports = {
    name:        'save',
    aliases:     ['savestatus', 'savedl', 'dlstatus'],
    description: 'Save a status by replying to it with this command',
    category:    'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        const botName = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '💾', key: msg.key } }); } catch {}

        const ctx2 = msg.message?.extendedTextMessage?.contextInfo
                  || msg.message?.imageMessage?.contextInfo
                  || msg.message?.videoMessage?.contextInfo;

        const quotedMsg   = ctx2?.quotedMessage;
        const quotedId    = ctx2?.stanzaId;
        const quotedOwner = ctx2?.participant || ctx2?.remoteJid || '';

        if (!quotedMsg) {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Usage* : Reply to a status with ${prefix}save\n║\n${F()}`
            }, { quoted: msg });
        }

        const detected = detectMedia(quotedMsg);

        if (!detected) {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Status* : ❌ No media found\n║ ▸ *Tip*    : Only images, videos, audio and stickers can be saved\n║\n${F()}`
            }, { quoted: msg });
        }

        try {
            const { type, inner } = detected;

            const syntheticMsg = {
                key: {
                    remoteJid: 'status@broadcast',
                    participant: quotedOwner,
                    id: quotedId || '',
                    fromMe: false,
                },
                message: inner,
            };

            const buf = await downloadMediaMessage(syntheticMsg, 'buffer', {});

            if (!buf || !buf.length) throw new Error('Empty download buffer');

            const sender  = (quotedOwner || 'unknown').split('@')[0].split(':')[0];
            const caption = `${H}\n║\n║ ▸ *From*   : +${sender}\n║ ▸ *Type*   : ${
                type === 'image'    ? '🖼️ Image' :
                type === 'video'    ? '📹 Video' :
                type === 'audio'    ? '🎵 Audio' :
                type === 'sticker'  ? '🪄 Sticker' :
                                      '📄 File'
            }\n║\n${F()}`;

            if (type === 'image') {
                await sock.sendMessage(chatId, { image: buf, caption }, { quoted: msg });
            } else if (type === 'video') {
                await sock.sendMessage(chatId, { video: buf, caption }, { quoted: msg });
            } else if (type === 'audio') {
                await sock.sendMessage(chatId, {
                    audio: buf,
                    mimetype: inner.audioMessage?.mimetype || 'audio/mp4',
                    ptt: inner.audioMessage?.ptt || false,
                }, { quoted: msg });
                await sock.sendMessage(chatId, { text: caption }, { quoted: msg });
            } else if (type === 'sticker') {
                await sock.sendMessage(chatId, { sticker: buf }, { quoted: msg });
                await sock.sendMessage(chatId, { text: caption }, { quoted: msg });
            } else {
                const docMsg = inner.documentMessage;
                await sock.sendMessage(chatId, {
                    document: buf,
                    mimetype: docMsg?.mimetype || 'application/octet-stream',
                    fileName: docMsg?.fileName || `status_${Date.now()}`,
                    caption,
                }, { quoted: msg });
            }

            await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Status* : ❌ Failed to save\n║ ▸ *Reason* : ${e.message}\n║\n${F()}`
            }, { quoted: msg });
        }
    }
};
