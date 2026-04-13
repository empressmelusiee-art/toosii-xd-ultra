const { BOT_NAME } = require('../../config');
const { resolvePhone } = require('../../lib/groupUtils');

module.exports = {
    name: 'vv',
    aliases: ['viewonce','vo'],
    description: 'Reveal a view-once photo/video/audio',
    category: 'utility',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId     = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '👁️', key: msg.key } }); } catch {}
        const senderJid  = msg.key.participant || msg.key.remoteJid;
        const isGroup    = chatId.endsWith('@g.us');
        const senderNum  = await resolvePhone(sock, chatId, senderJid);
        const dmJid      = `${senderNum}@s.whatsapp.net`;

        const ctxInfo  = msg.message?.extendedTextMessage?.contextInfo;
        const stanzaId = ctxInfo?.stanzaId;

        if (!stanzaId || !ctxInfo?.quotedMessage) return sock.sendMessage(chatId, {
            text: `╔═|〔  VIEW ONCE 〕\n║\n║ ▸ *Usage* : Reply to a view-once\n║           message with ${prefix}vv\n║ ▸ *Tip*   : Add "group" to post in chat\n║           ${prefix}vv group\n║\n╚═╝`
        }, { quoted: msg });

        function detectViewOnce(m) {
            if (!m) return null;
            const v2 = m.viewOnceMessageV2?.message || m.viewOnceMessageV2Extension?.message;
            if (v2) {
                if (v2.imageMessage) return { type: 'image', media: v2.imageMessage };
                if (v2.videoMessage) return { type: 'video', media: v2.videoMessage };
                if (v2.audioMessage) return { type: 'audio', media: v2.audioMessage };
            }
            const vom = m.viewOnceMessage?.message;
            if (vom) {
                if (vom.imageMessage) return { type: 'image', media: vom.imageMessage };
                if (vom.videoMessage) return { type: 'video', media: vom.videoMessage };
                if (vom.audioMessage) return { type: 'audio', media: vom.audioMessage };
            }
            const eph = m.ephemeralMessage?.message;
            if (eph) {
                const ev2 = eph.viewOnceMessageV2?.message || eph.viewOnceMessageV2Extension?.message;
                if (ev2?.imageMessage) return { type: 'image', media: ev2.imageMessage };
                if (ev2?.videoMessage) return { type: 'video', media: ev2.videoMessage };
                if (ev2?.audioMessage) return { type: 'audio', media: ev2.audioMessage };
                const evm = eph.viewOnceMessage?.message;
                if (evm?.imageMessage) return { type: 'image', media: evm.imageMessage };
                if (evm?.videoMessage) return { type: 'video', media: evm.videoMessage };
                if (evm?.audioMessage) return { type: 'audio', media: evm.audioMessage };
            }
            if (m.imageMessage?.viewOnce) return { type: 'image', media: m.imageMessage };
            if (m.videoMessage?.viewOnce) return { type: 'video', media: m.videoMessage };
            if (m.audioMessage?.viewOnce) return { type: 'audio', media: m.audioMessage };
            return null;
        }

        // 1. Try in-memory cache first
        const cache      = globalThis.viewOnceCache_ref;
        const cachedMsg  = cache?.get(`${chatId}|${stanzaId}`) || cache?.get(stanzaId);
        const rawMessage = cachedMsg?.message || cachedMsg || ctxInfo.quotedMessage;

        // 2. Fall back to quoted message embedded in the reply (always available)
        const detected = detectViewOnce(rawMessage);
        if (!detected) return sock.sendMessage(chatId, {
            text: `╔═|〔  VIEW ONCE 〕\n║\n║ ▸ *Status* : ❌ Not a view-once message\n║ ▸ *Tip*    : Reply directly to the\n║             view-once message\n║\n╚═╝`
        }, { quoted: msg });

        try {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');

            // Build a synthetic WAMessage so downloadMediaMessage can extract the URL
            const syntheticMsg = {
                key: {
                    remoteJid: chatId,
                    id: stanzaId,
                    participant: ctxInfo.participant || undefined,
                    fromMe: false,
                },
                message: rawMessage
            };

            const buf = await downloadMediaMessage(syntheticMsg, 'buffer', {});
            if (!buf || buf.length === 0) throw new Error('Empty buffer — media key may be stripped from view-once quote');

            const voSenderJid = ctxInfo?.participant || senderJid;
            const sentBy      = await resolvePhone(sock, chatId, voSenderJid);
            const botName   = (ctx?.BOT_NAME || BOT_NAME || 'Toosii AI');
            const timeStr   = new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            let   groupName = '';
            if (isGroup) { try { groupName = (await sock.groupMetadata(chatId)).subject; } catch {} }

            const { type, media } = detected;
            const sendToGroup     = args[0]?.toLowerCase() === 'group';
            const destJid         = sendToGroup ? chatId : dmJid;
            const caption         = `╔═|〔  VIEW ONCE 〕\n║\n║ ▸ *Sent by*   : +${sentBy || 'Unknown'}\n║ ▸ *Via*       : ${botName} (Manual)\n║ ▸ *Time*      : ${timeStr}\n║ ▸ *${groupName ? `Group*     : ${groupName}` : `Chat*      : Private`}\n║\n╚═╝`;

            if (type === 'image') {
                await sock.sendMessage(destJid, { image: buf, caption });
            } else if (type === 'video') {
                await sock.sendMessage(destJid, { video: buf, caption });
            } else if (type === 'audio') {
                await sock.sendMessage(destJid, { audio: buf, mimetype: media.mimetype || 'audio/ogg; codecs=opus', ptt: media.ptt || false });
                await sock.sendMessage(destJid, { text: caption });
            }

            if (isGroup && !sendToGroup) {
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  VIEW ONCE 〕\n║\n║ ▸ *Status* : ✅ Sent to your DM\n║ ▸ *User*   : @${senderNum}\n║\n╚═╝`,
                    mentions: [dmJid]
                }, { quoted: msg });
            }
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  VIEW ONCE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    }
};
