const { casperGet, keithTry, extractUrl, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'fb',
    aliases: ['facebook', 'fbdl', 'fbdown'],
    description: 'Download Facebook video (HD/SD)',
    category: 'download',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const url    = args[0];

        if (!url) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  FACEBOOK 〕\n║\n║ ▸ *Usage* : ${prefix}fb <url>\n║\n╚═╝`
            }, { quoted: msg });
        }

        try {
            let dlUrl, title, qual;

            // ── Primary: casper ────────────────────────────────────────────
            try {
                const data = await casperGet('/api/downloader/fb', { url });
                if (!data.success) throw new Error(data.error || 'Casper: no result');
                dlUrl = data.primaryDownload || data.downloads?.[0]?.url;
                title = data.title || 'Facebook Video';
                qual  = data.downloads?.[0]?.quality || 'HD';
                if (!dlUrl) throw new Error('Casper: no download URL');
            } catch {
                // ── Fallback: keith ────────────────────────────────────────
                const data2 = await keithTry(['/download/fbdl', '/download/fbdown'], { url });
                dlUrl = extractUrl(data2.result);
                title = 'Facebook Video';
                qual  = 'HD';
                if (!dlUrl) throw new Error('No download URL found');
            }

            const buf    = await dlBuffer(dlUrl);
            const sizeMB = (buf.length / 1024 / 1024).toFixed(2);
            const banner = `╔═|〔  FACEBOOK 〕\n║\n║ ▸ *Title*  : ${title}\n║ ▸ *Quality*: ${qual}\n║ ▸ *Size*   : ${sizeMB} MB\n║\n╚═╝`;

            await sock.sendMessage(chatId, { video: buf, caption: banner }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  FACEBOOK 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═╝`
            }, { quoted: msg });
        }
    },
};
