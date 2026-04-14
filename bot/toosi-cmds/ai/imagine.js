'use strict';

const { getBotName } = require('../../lib/botname');

const SIZES = {
    square:    { w: 1024, h: 1024, label: 'Square (1:1)' },
    portrait:  { w: 768,  h: 1024, label: 'Portrait (3:4)' },
    landscape: { w: 1280, h: 720,  label: 'Landscape (16:9)' },
    wide:      { w: 1024, h: 576,  label: 'Wide (16:9)' },
};

async function generateImage(prompt, w = 1024, h = 1024, timeoutMs = 40000) {
    const encoded = encodeURIComponent(prompt);
    const url     = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&nologo=true&model=flux&enhance=true`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'ToosiiBot/1.0', Accept: 'image/*' }
        });
        if (!res.ok) throw new Error(`Image API HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length) throw new Error('Empty image response');
        return buf;
    } finally { clearTimeout(timer); }
}

module.exports = {
    name: 'imagine',
    aliases: ['imgen', 'aimage', 'genimage', 'aiart', 'draw', 'paint', 'generate'],
    description: 'Generate an AI image from a text prompt — .imagine <prompt>',
    category: 'ai',

    async execute(sock, msg, args, prefix) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  🎨 AI IMAGE GEN 〕`,
                    `║`,
                    `║ ▸ *Usage*   : ${prefix}imagine <prompt>`,
                    `║ ▸ *Size*    : add | square | portrait | landscape (optional)`,
                    `║`,
                    `║ 📌 *Examples*`,
                    `║  ${prefix}imagine a lion wearing a crown in a golden sunset`,
                    `║  ${prefix}imagine cyberpunk Nairobi at night | landscape`,
                    `║  ${prefix}imagine anime girl with flowers | portrait`,
                    `║`,
                    `║ ⏳ Takes ~10-20 seconds`,
                    `║`,
                    `╚═|〔 ${name} 〕`,
                ].join('\n')
            }, { quoted: msg });
        }

        const raw   = args.join(' ');
        const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
        const prompt = parts[0];

        let size = SIZES.square;
        if (parts[1]) {
            const key = parts[1].toLowerCase();
            if (SIZES[key]) size = SIZES[key];
        }

        if (!prompt) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  🎨 AI IMAGE 〕\n║\n║ ▸ Please describe what to generate!\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '🎨', key: msg.key } });

            const buf = await generateImage(prompt, size.w, size.h);

            const caption = [
                `╔═|〔  🎨 AI IMAGE 〕`,
                `║`,
                `║ ▸ *Prompt* : ${prompt.length > 70 ? prompt.substring(0, 70) + '...' : prompt}`,
                `║ ▸ *Size*   : ${size.label}`,
                `║ ▸ *Model*  : Flux (Toosii AI)`,
                `║`,
                `╚═|〔 ${name} 〕`,
            ].join('\n');

            await sock.sendMessage(chatId, {
                image: buf,
                caption,
                mimetype: 'image/jpeg',
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎨 AI IMAGE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║ ▸ 💡 Try a simpler or more descriptive prompt\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
