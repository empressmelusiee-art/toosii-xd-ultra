const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'tostatus',
    aliases: ['poststatus', 'setstatus'],
    description: 'Post text / image / video / audio as the bot personal WhatsApp status',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  TO STATUS 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n╚═╝`
            }, { quoted: msg });
        }

        const ctxInfo   = msg.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = ctxInfo?.quotedMessage;
        const caption   = args.join(' ').trim();

        // Build audience: group members if in group, else empty (WA uses privacy settings)
        let statusJidList = [];
        if (chatId.endsWith('@g.us')) {
            try {
                const meta = await sock.groupMetadata(chatId);
                statusJidList = meta.participants.map(p => p.id);
            } catch {}
        }

        const opts = { statusJidList, backgroundColor: '#25D366', font: 2 };

        try {
            if (quotedMsg) {
                const msgType = Object.keys(quotedMsg)[0];
                const isImage = msgType === 'imageMessage';
                const isVideo = msgType === 'videoMessage';
                const isAudio = msgType === 'audioMessage';

                if (isImage || isVideo || isAudio) {
                    const syntheticMsg = {
                        key: { remoteJid: chatId, id: ctxInfo.stanzaId, participant: ctxInfo.participant, fromMe: false },
                        message: quotedMsg,
                    };
                    const buf = await downloadMediaMessage(syntheticMsg, 'buffer', {});
                    if (!buf?.length) throw new Error('Could not download media');

                    if (isImage) {
                        await sock.sendMessage('status@broadcast', { image: buf, caption: caption || '' }, opts);
                    } else if (isVideo) {
                        await sock.sendMessage('status@broadcast', { video: buf, caption: caption || '' }, opts);
                    } else {
                        const mime = quotedMsg.audioMessage?.mimetype || 'audio/ogg; codecs=opus';
                        const ptt  = quotedMsg.audioMessage?.ptt || false;
                        await sock.sendMessage('status@broadcast', { audio: buf, mimetype: mime, ptt },
                            { ...opts, backgroundColor: '#000000' });
                    }

                    const typeLabel = isImage ? '🖼️ Image' : isVideo ? '📹 Video' : '🎵 Audio';
                    return sock.sendMessage(chatId, {
                        text: `╔═|〔  TO STATUS 〕\n║\n║ ▸ *Type*     : ${typeLabel}\n║ ▸ *Audience* : ${statusJidList.length || 'all'}\n║ ▸ *Status*   : ✅ Posted\n║\n╚═╝`
                    }, { quoted: msg });
                }

                if (!caption) {
                    const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
                    if (quotedText) {
                        await sock.sendMessage('status@broadcast', { text: quotedText }, opts);
                        return sock.sendMessage(chatId, {
                            text: `╔═|〔  TO STATUS 〕\n║\n║ ▸ *Type*     : 📝 Text\n║ ▸ *Audience* : ${statusJidList.length || 'all'}\n║ ▸ *Status*   : ✅ Posted\n║\n╚═╝`
                        }, { quoted: msg });
                    }
                }
            }

            if (!caption) {
                return sock.sendMessage(chatId, {
                    text: [`╔═|〔  TO STATUS 〕`, `║`, `║ ▸ *Usage* : ${prefix}tostatus <text>`, `║  or reply image / video / audio`, `║`, `╚═╝`].join('\n')
                }, { quoted: msg });
            }

            await sock.sendMessage('status@broadcast', { text: caption }, opts);
            return sock.sendMessage(chatId, {
                text: `╔═|〔  TO STATUS 〕\n║\n║ ▸ *Type*     : 📝 Text\n║ ▸ *Audience* : ${statusJidList.length || 'all'}\n║ ▸ *Status*   : ✅ Posted\n║\n╚═╝`
            }, { quoted: msg });

        } catch (e) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  TO STATUS 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    },
};
