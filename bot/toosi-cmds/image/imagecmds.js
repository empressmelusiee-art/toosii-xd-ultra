const { keithGet, dlBuffer } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const BASE = 'https://apiskeith.top';

// ── Helpers ────────────────────────────────────────────────────────────────

async function uploadToCatbox(buffer, filename = 'image.jpg') {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', '');
    form.append('fileToUpload', new Blob([buffer]), filename);
    const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST', body: form, signal: AbortSignal.timeout(30000)
    });
    const url = await res.text();
    if (!url.startsWith('http')) throw new Error('Upload failed: ' + url);
    return url.trim();
}

async function getImageUrl(sock, msg, args) {
    // Priority 1: URL in args
    const urlArg = args.find(a => a.startsWith('http'));
    if (urlArg) return urlArg;

    // Priority 2: quoted or direct image message
    const ctxInfo = msg.message?.extendedTextMessage?.contextInfo
                 || msg.message?.imageMessage?.contextInfo;
    const quoted  = ctxInfo?.quotedMessage;
    const direct  = msg.message?.imageMessage;

    let buf = null;
    if (direct) {
        buf = await downloadMediaMessage(msg, 'buffer', {});
    } else if (quoted?.imageMessage) {
        const synth = {
            key: { ...msg.key, id: ctxInfo.stanzaId, participant: ctxInfo.participant },
            message: quoted
        };
        buf = await downloadMediaMessage(synth, 'buffer', {});
    }
    if (buf) return uploadToCatbox(buf);
    return null;
}

async function fetchRawImage(path, params) {
    const qs  = new URLSearchParams(params).toString();
    const res = await fetch(BASE + path + '?' + qs, { signal: AbortSignal.timeout(40000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) throw new Error('Empty image returned');
    return { buf, mime: res.headers.get('content-type') || 'image/jpeg' };
}

// ── Preset Photofunia effects ──────────────────────────────────────────────
const PF_EFFECTS = {
    sketch:     'https://m.photofunia.com/effects/sketch-practicing',
    watercolor: 'https://m.photofunia.com/effects/watercolor',
    polaroid:   'https://m.photofunia.com/effects/polaroid',
    frames:     'https://m.photofunia.com/effects/frames',
    mosaic:     'https://m.photofunia.com/effects/mosaic',
    drawing:    'https://m.photofunia.com/effects/drawing',
};

// ── Preset Ephoto templates ────────────────────────────────────────────────
const EPHOTO_TEMPLATES = {
    neon:      'https://en.ephoto360.com/neon-text-effect-online-523.html',
    fire:      'https://en.ephoto360.com/fire-text-effect-online-499.html',
    gold:      'https://en.ephoto360.com/gold-text-effect-online-558.html',
    ice:       'https://en.ephoto360.com/frozen-ice-text-effect-online-556.html',
    glow:      'https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html',
    graffiti:  'https://en.ephoto360.com/graffiti-creator-text-effect-online-543.html',
    retro:     'https://en.ephoto360.com/retro-text-effect-online-552.html',
};

// ── Commands ───────────────────────────────────────────────────────────────

const hdCmd = {
    name: 'hd',
    aliases: ['enhance', 'hdimage', 'upscale', 'hdup'],
    description: 'Enhance any image to HD quality using AI',
    category: 'image',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            const imageUrl = await getImageUrl(sock, msg, args);
            if (!imageUrl) return sock.sendMessage(chatId, {
                text: `╔═|〔  🔆 HD ENHANCE 〕\n║\n║ ▸ *Usage* : Send/quote an image or ${prefix}hd <image_url>\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });

            await sock.sendMessage(chatId, { react: { text: '🔆', key: msg.key } });
            const data = await keithGet('/ai/hd', { url: imageUrl });
            if (!data.status || !Array.isArray(data.result) || !data.result[0]) throw new Error(data.error || 'Enhancement failed');

            const buf = await dlBuffer(data.result[0]);
            await sock.sendMessage(chatId, {
                image: buf,
                caption: `╔═|〔  🔆 HD ENHANCE 〕\n║\n║ ▸ *Status* : ✅ Enhanced to HD\n║ ▸ *Size*   : ${(buf.length / 1024).toFixed(0)} KB\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🔆 HD ENHANCE 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const wallpaperCmd = {
    name: 'wallpaper',
    aliases: ['wall', 'wp', 'wallpap'],
    description: 'Get HD wallpapers by keyword',
    category: 'image',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim() || 'nature';
        try {
            await sock.sendMessage(chatId, { react: { text: '🖼️', key: msg.key } });
            const data = await keithGet('/download/wallpaper', { text: query, page: 1 });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'No wallpapers found');

            const pack  = data.result[0];
            const images = pack.image || [];
            if (!images.length) throw new Error('No images in result');

            // Pick a random one from first pack
            const imgUrl = images[Math.floor(Math.random() * Math.min(images.length, 5))];
            const buf = await dlBuffer(imgUrl);

            await sock.sendMessage(chatId, {
                image: buf,
                caption: `╔═|〔  🖼️ WALLPAPER 〕\n║\n║ ▸ *Query* : ${query}\n║ ▸ *Type*  : ${pack.type || 'HD'}\n║ ▸ *Size*  : ${(buf.length / 1024).toFixed(0)} KB\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🖼️ WALLPAPER 〕\n║\n║ ▸ *Usage* : ${prefix}wallpaper <keyword>\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const photofuniaCmd = {
    name: 'photofunia',
    aliases: ['pfx', 'peffect', 'pfunia', 'photoeffect'],
    description: 'Apply artistic photo effects (sketch, watercolor, polaroid…)',
    category: 'image',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        // .photofunia effects  → show list
        if (args[0] === 'effects' || args[0] === 'list') {
            const list = Object.keys(PF_EFFECTS).map(k => `║ ▸ ${k}`).join('\n');
            return sock.sendMessage(chatId, {
                text: `╔═|〔  🎨 PHOTOFUNIA EFFECTS 〕\n║\n${list}\n║\n║ *Usage* : ${prefix}photofunia <effect> <image>\n║ *Example* : ${prefix}photofunia sketch\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        // Determine effect
        let effectKey = 'sketch';
        let filteredArgs = args;
        if (args[0] && PF_EFFECTS[args[0].toLowerCase()]) {
            effectKey = args[0].toLowerCase();
            filteredArgs = args.slice(1);
        }
        const effectUrl = PF_EFFECTS[effectKey];

        try {
            const imageUrl = await getImageUrl(sock, msg, filteredArgs);
            if (!imageUrl) return sock.sendMessage(chatId, {
                text: `╔═|〔  🎨 PHOTOFUNIA 〕\n║\n║ ▸ *Usage*   : ${prefix}photofunia [effect] (send/quote image)\n║ ▸ *Effects* : ${prefix}photofunia effects\n║ ▸ *Example* : ${prefix}photofunia watercolor\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });

            await sock.sendMessage(chatId, { react: { text: '🎨', key: msg.key } });
            const data = await keithGet('/logo/photofunia', { effect: effectUrl, url: imageUrl });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'Effect failed');

            // Prefer "Large" size
            const best = data.result.find(r => r.size === 'Large') || data.result[0];
            const dlUrl = best.url.replace('?download', '');
            const buf   = await dlBuffer(dlUrl);

            await sock.sendMessage(chatId, {
                image: buf,
                caption: `╔═|〔  🎨 PHOTOFUNIA 〕\n║\n║ ▸ *Effect* : ${effectKey}\n║ ▸ *Size*   : ${(buf.length / 1024).toFixed(0)} KB\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎨 PHOTOFUNIA 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const removebgCmd = {
    name: 'removebg',
    aliases: ['rmbg', 'nobg', 'bgremove', 'cutbg'],
    description: 'Remove background from any image using AI',
    category: 'image',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            const imageUrl = await getImageUrl(sock, msg, args);
            if (!imageUrl) return sock.sendMessage(chatId, {
                text: `╔═|〔  ✂️ REMOVE BG 〕\n║\n║ ▸ *Usage* : Send/quote an image or ${prefix}removebg <image_url>\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });

            await sock.sendMessage(chatId, { react: { text: '✂️', key: msg.key } });
            const data = await keithGet('/ai/removebg', { url: imageUrl });
            if (!data.status || !data.result) throw new Error(data.error || 'Background removal failed');

            const resultUrl = typeof data.result === 'string' ? data.result : data.result?.url;
            if (!resultUrl) throw new Error('No output URL');

            const buf = await dlBuffer(resultUrl);
            await sock.sendMessage(chatId, {
                image: buf,
                caption: `╔═|〔  ✂️ REMOVE BG 〕\n║\n║ ▸ *Status* : ✅ Background removed\n║ ▸ *Size*   : ${(buf.length / 1024).toFixed(0)} KB\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ✂️ REMOVE BG 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const ephotoCmd = {
    name: 'ephoto',
    aliases: ['textlogo', 'logotext', 'fancytext', 'elogo'],
    description: 'Generate stylish text logos with cool effects',
    category: 'image',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        if (!args.length || args[0] === 'styles') {
            const list = Object.keys(EPHOTO_TEMPLATES).map(k => `║ ▸ ${k}`).join('\n');
            return sock.sendMessage(chatId, {
                text: `╔═|〔  ✨ TEXT LOGO 〕\n║\n║ *Available styles:*\n${list}\n║\n║ *Usage* : ${prefix}ephoto <style> <text>\n║ *Example* : ${prefix}ephoto neon TOOSII\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        let style = 'glow';
        let textArgs = args;
        if (EPHOTO_TEMPLATES[args[0]?.toLowerCase()]) {
            style    = args[0].toLowerCase();
            textArgs = args.slice(1);
        }

        const text = textArgs.join(' ').trim();
        if (!text) return sock.sendMessage(chatId, {
            text: `╔═|〔  ✨ TEXT LOGO 〕\n║\n║ ▸ *Usage* : ${prefix}ephoto <style> <text>\n║ ▸ *Styles* : ${prefix}ephoto styles\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });

        try {
            await sock.sendMessage(chatId, { react: { text: '✨', key: msg.key } });
            const templateUrl = EPHOTO_TEMPLATES[style];
            const data = await keithGet('/logo/ephoto', { url: templateUrl, text1: text });
            if (!data.status || !data.result?.download_url) throw new Error(data.error || 'Logo generation failed');

            const buf = await dlBuffer(data.result.download_url);
            await sock.sendMessage(chatId, {
                image: buf,
                caption: `╔═|〔  ✨ TEXT LOGO 〕\n║\n║ ▸ *Text*  : ${text}\n║ ▸ *Style* : ${style}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ✨ TEXT LOGO 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const magicstudioCmd = {
    name: 'aiart',
    aliases: ['magicstudio', 'aiimage', 'aigenimage', 'genimage'],
    description: 'Generate AI artwork from a text prompt using MagicStudio',
    category: 'image',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const prompt = args.join(' ').trim();
        if (!prompt) return sock.sendMessage(chatId, {
            text: `╔═|〔  🖌️ AI ART 〕\n║\n║ ▸ *Usage* : ${prefix}aiart <description>\n║ ▸ *Example* : ${prefix}aiart a dragon flying over a city at sunset\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🖌️', key: msg.key } });
            const { buf, mime } = await fetchRawImage('/ai/magicstudio', { prompt });
            await sock.sendMessage(chatId, {
                image: buf,
                mimetype: mime,
                caption: `╔═|〔  🖌️ AI ART 〕\n║\n║ ▸ *Prompt* : ${prompt.substring(0, 80)}\n║ ▸ *Engine* : MagicStudio\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🖌️ AI ART 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const fluxCmd = {
    name: 'flux',
    aliases: ['fluxai', 'fluxart', 'fluximage', 'genflux'],
    description: 'Generate AI images using the Flux model',
    category: 'image',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const prompt = args.join(' ').trim();
        if (!prompt) return sock.sendMessage(chatId, {
            text: `╔═|〔  ⚡ FLUX AI 〕\n║\n║ ▸ *Usage* : ${prefix}flux <description>\n║ ▸ *Example* : ${prefix}flux a futuristic cyberpunk city\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '⚡', key: msg.key } });
            const { buf, mime } = await fetchRawImage('/ai/flux', { q: prompt });
            await sock.sendMessage(chatId, {
                image: buf,
                mimetype: mime,
                caption: `╔═|〔  ⚡ FLUX AI 〕\n║\n║ ▸ *Prompt* : ${prompt.substring(0, 80)}\n║ ▸ *Engine* : Flux\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  ⚡ FLUX AI 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [hdCmd, wallpaperCmd, photofuniaCmd, removebgCmd, ephotoCmd, magicstudioCmd, fluxCmd];
