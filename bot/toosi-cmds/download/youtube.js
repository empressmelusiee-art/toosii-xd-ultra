const { casperGet, keithTry, extractUrl, dlBuffer, convertTo128kbps } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

const KEITH_AUDIO = ['/download/ytmp3','/download/audio','/download/dlmp3','/download/mp3','/download/yta','/download/yta2','/download/yta3','/download/yta4','/download/yta5'];
const KEITH_VIDEO = ['/download/ytmp4','/download/video','/download/dlmp4','/download/mp4','/download/ytv','/download/ytv2','/download/ytv3','/download/ytv4','/download/ytv5'];

async function ytDownload(sock, msg, args, prefix, ctx, type) {
    const chatId = msg.key.remoteJid;
    const name   = getBotName();
    const url    = args[0];

    if (!url) {
        return sock.sendMessage(chatId, {
            text: `╔═|〔  YOUTUBE ${type.toUpperCase()} 〕\n║\n║ ▸ *Usage* : ${prefix}yt${type === 'audio' ? 'a' : 'v'} <url>\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
    }

    try {
        if (type === 'audio') {
            let buf, title, quality;
            try {
                const data = await casperGet('/api/downloader/ytmp3', { url, quality: '128' });
                if (!data.success || !data.url) throw new Error(data.error || 'No audio URL');
                title   = data.title || 'audio';
                quality = data.quality || '128kbps';
                buf     = await dlBuffer(data.url);
            } catch {
                const data2 = await keithTry(KEITH_AUDIO, { url });
                const dlUrl = extractUrl(data2.result);
                if (!dlUrl) throw new Error('No audio URL found');
                buf     = await dlBuffer(dlUrl);
                buf     = await convertTo128kbps(buf);
                title   = 'audio';
                quality = '128kbps';
            }
            const banner = `╔═|〔  YOUTUBE AUDIO 〕\n║\n║ ▸ *Track*   : ${title}\n║ ▸ *Quality* : ${quality}\n║ ▸ *Size*    : ${(buf.length/1024/1024).toFixed(2)} MB\n║\n╚═|〔 ${name} 〕`;
            await sock.sendMessage(chatId, { document: buf, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: banner }, { quoted: msg });

        } else {
            let buf, title, quality;
            try {
                const data = await casperGet('/api/downloader/ytmp4', { url });
                if (!data.success || !data.data?.downloads?.length) throw new Error(data.error || 'No video data');
                const best = data.data.downloads.find(d => d.hasAudio) || data.data.downloads[0];
                title   = data.data.title || 'video';
                quality = best.quality;
                buf     = await dlBuffer(best.url);
            } catch {
                const data2 = await keithTry(KEITH_VIDEO, { url });
                const dlUrl = extractUrl(data2.result);
                if (!dlUrl) throw new Error('No video URL found');
                buf     = await dlBuffer(dlUrl);
                title   = 'video';
                quality = 'HD';
            }
            const banner = `╔═|〔  YOUTUBE VIDEO 〕\n║\n║ ▸ *Title*   : ${title}\n║ ▸ *Quality* : ${quality}\n║ ▸ *Size*    : ${(buf.length/1024/1024).toFixed(2)} MB\n║\n╚═|〔 ${name} 〕`;
            await sock.sendMessage(chatId, { video: buf, caption: banner }, { quoted: msg });
        }

    } catch (e) {
        await sock.sendMessage(chatId, {
            text: `╔═|〔  YOUTUBE ${type.toUpperCase()} 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
    }
}

module.exports = [
    {
        name: 'yta',
        aliases: ['ytaudio', 'ytmp3', 'youtubeaudio'],
        description: 'Download YouTube audio (128kbps MP3)',
        category: 'download',
        async execute(sock, msg, args, prefix, ctx) { return ytDownload(sock, msg, args, prefix, ctx, 'audio'); }
    },
    {
        name: 'ytv',
        aliases: ['ytvideo', 'ytmp4', 'youtubevideo'],
        description: 'Download YouTube video (MP4)',
        category: 'download',
        async execute(sock, msg, args, prefix, ctx) { return ytDownload(sock, msg, args, prefix, ctx, 'video'); }
    }
];
