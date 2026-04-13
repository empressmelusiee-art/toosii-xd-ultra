const { casperGet, keithTry, extractUrl, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'ig',
    aliases: ['insta', 'instagram', 'instadl'],
    description: 'Download Instagram post/reel/story',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const url    = args[0];

        if (!url) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  INSTAGRAM 〕\n║\n║ ▸ *Usage* : ${prefix}ig <url>\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            let dlUrl, isVid;

            try {
                const data = await casperGet('/api/downloader/ig', { url });
                if (!data.success) throw new Error(data.error || 'Casper: no result');
                dlUrl = data.download_url || data.all_media?.[0]?.url;
                if (!dlUrl) throw new Error('Casper: no media URL');
                isVid = dlUrl.includes('.mp4') || data.type === 'video';
            } catch {
                const data2 = await keithTry(['/download/instadl', '/download/instaposts'], { url });
                dlUrl = extractUrl(data2.result);
                if (!dlUrl) throw new Error('No download URL found');
                isVid = dlUrl.includes('.mp4') || dlUrl.includes('video');
            }

            const buf    = await dlBuffer(dlUrl);
            const banner = `╔═|〔  INSTAGRAM 〕\n║\n║ ▸ *Type* : ${isVid ? '📹 Video' : '🖼️ Image'}\n║ ▸ *Size* : ${(buf.length/1024/1024).toFixed(2)} MB\n║\n╚═|〔 ${name} 〕`;

            if (isVid) await sock.sendMessage(chatId, { video: buf, caption: banner }, { quoted: msg });
            else        await sock.sendMessage(chatId, { image: buf, caption: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  INSTAGRAM 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
