'use strict';

const { casperGet, dlBuffer } = require('../../lib/keithapi');
const { getBotName }          = require('../../lib/botname');

const GENRES = ['Pop','Afrobeat','Hip-hop','R&B','Rock','Jazz','Reggae','Country','Electronic','Soul','Blues','Classical','Trap','Dancehall','Gospel','Indie','Folk','Lo-fi'];
const MOODS  = ['Happy','Sad','Romantic','Energetic','Calm','Passionate','Melancholic','Nostalgic','Motivational','Playful'];
const VOCALS = ['male','female'];

function matchList(token, list) {
    return list.find(i => i.toLowerCase() === token.toLowerCase()) || null;
}

const makemusicCmd = {
    name       : 'makemusic',
    aliases    : ['aimusic','musicai','genmusic','songgen','aitrack','musicgen'],
    description: 'Generate a full AI-composed MP3 song from a text prompt',
    category   : 'ai',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  🎵 AI MUSIC GENERATOR 〕`,
                    `║`,
                    `║ ▸ *Usage*    : ${prefix}makemusic <prompt>`,
                    `║ ▸ *Genre*    : add | <genre> to set (optional)`,
                    `║ ▸ *Mood*     : add | <mood> to set (optional)`,
                    `║ ▸ *Vocal*    : add | Male or Female (optional)`,
                    `║ ▸ *No vocals*: add | instrumental (optional)`,
                    `║`,
                    `║ 📌 *Examples*`,
                    `║  ${prefix}makemusic a love song about Nairobi nights`,
                    `║  ${prefix}makemusic party anthem | Afrobeat | Energetic | Female`,
                    `║  ${prefix}makemusic peaceful vibes | Lo-fi | Calm | instrumental`,
                    `║  ${prefix}makemusic hustle motivation | Hip-hop | Motivational`,
                    `║`,
                    `║ 🎼 *Genres*  : Pop, Afrobeat, Hip-hop, R&B, Rock, Jazz,`,
                    `║               Reggae, Country, Electronic, Soul, Blues,`,
                    `║               Classical, Trap, Dancehall, Gospel, Indie,`,
                    `║               Folk, Lo-fi`,
                    `║ 🎭 *Moods*   : Happy, Sad, Romantic, Energetic, Calm,`,
                    `║               Passionate, Melancholic, Nostalgic,`,
                    `║               Motivational, Playful`,
                    `║`,
                    `║ ⏳ *Note* : Generation takes ~2-3 minutes`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        const raw   = args.join(' ');
        const parts = raw.split('|').map(s => s.trim()).filter(Boolean);

        let prompt       = parts[0];
        let genre        = null;
        let mood         = null;
        let vocal        = null;
        let instrumental = false;

        for (let i = 1; i < parts.length; i++) {
            const p = parts[i].trim();
            if (p.toLowerCase() === 'instrumental') { instrumental = true; continue; }
            const g = matchList(p, GENRES);
            if (g) { genre = g; continue; }
            const m = matchList(p, MOODS);
            if (m) { mood = m; continue; }
            if (VOCALS.includes(p.toLowerCase())) { vocal = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); continue; }
        }

        if (!prompt) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  🎵 AI MUSIC 〕\n║\n║ ▸ Please provide a prompt!\n║ ▸ *Usage* : ${prefix}makemusic <prompt>\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try { await sock.sendMessage(chatId, { react: { text: '🎵', key: msg.key } }); } catch {}

        const genreLabel = genre || 'Pop';
        const moodLabel  = mood  || 'Happy';
        const vocalLabel = instrumental ? 'Instrumental' : (vocal || 'Male');

        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  🎵 AI MUSIC GENERATOR 〕`,
                `║`,
                `║ ▸ *Prompt* : ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}`,
                `║ ▸ *Genre*  : ${genreLabel}`,
                `║ ▸ *Mood*   : ${moodLabel}`,
                `║ ▸ *Vocal*  : ${vocalLabel}`,
                `║`,
                `║ ⏳ Generating your song... (2-3 mins)`,
                `║ 🎧 Sit tight, AI is composing! 🔥`,
                `║`,
                `╚═|〔 ${name} 〕`,
            ].join('\n')
        }, { quoted: msg });

        try {
            const params = { prompt, genre: genreLabel, mood: moodLabel };
            if (vocal)        params.vocal        = vocalLabel;
            if (instrumental) params.instrumental = 'true';

            // Retry up to 3 attempts on 502/503/504 (Casper overload)
            let data, lastErr;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    data = await casperGet('/api/tools/text-to-music', params, 210000);
                    lastErr = null;
                    break;
                } catch (e) {
                    lastErr = e;
                    const is5xx = /50[234]/.test(e.message);
                    if (is5xx && attempt < 3) {
                        await new Promise(r => setTimeout(r, 15000 * attempt));
                        continue;
                    }
                    throw e;
                }
            }
            if (lastErr) throw lastErr;

            if (!data.success) throw new Error(data.error || data.message || 'Music generation failed');

            const audioUrl = data.audioUrl || data.audio_url || data.url;
            if (!audioUrl) throw new Error('No audio URL in response');

            const buf = await dlBuffer(audioUrl);

            const title   = data.title   || prompt.substring(0, 40);
            const caption = [
                `╔═|〔  🎵 AI MUSIC READY 〕`,
                `║`,
                `║ ▸ *Title*  : ${title}`,
                `║ ▸ *Genre*  : ${data.genre  || genreLabel}`,
                `║ ▸ *Mood*   : ${data.mood   || moodLabel}`,
                `║ ▸ *Vocal*  : ${vocalLabel}`,
                `║ ▸ *Prompt* : ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`,
                `║`,
                `║ 🤖 Powered by Toosii AI 🔥`,
                `║`,
                `╚═|〔 ${name} 〕`,
            ].join('\n');

            await sock.sendMessage(chatId, {
                audio    : buf,
                mimetype : 'audio/mpeg',
                ptt      : false,
                fileName : `${title.replace(/[^\w\s-]/g, '').trim() || 'toosii-music'}.mp3`,
                caption,
            }, { quoted: msg });

        } catch (e) {
            const is5xx  = /50[234]/.test(e.message);
            const reason = is5xx
                ? 'Casper servers are busy right now — tried 3 times'
                : e.message;
            const tip = is5xx
                ? '⏳ Wait a few minutes then try again'
                : '💡 Try again — generation can sometimes timeout';
            await sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  🎵 AI MUSIC 〕`,
                    `║`,
                    `║ ▸ *Status* : ❌ Failed`,
                    `║ ▸ *Reason* : ${reason}`,
                    `║`,
                    `║ ${tip}`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }
    }
};

module.exports = [makemusicCmd];
