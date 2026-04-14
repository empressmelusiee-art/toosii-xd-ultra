'use strict';

const { setConfig }          = require('../../lib/database');
const { getBotName }         = require('../../lib/botname');
const { isButtonModeEnabled, setButtonMode } = require('../../lib/buttonMode');
const { isChannelModeEnabled, setChannelMode, getChannelInfo } = require('../../lib/channelMode');

const MODES = {
    public  : { label: 'PUBLIC',  icon: '🌍', desc: 'Responds to everyone in all chats' },
    groups  : { label: 'GROUPS',  icon: '👥', desc: 'Responds only in group chats' },
    dms     : { label: 'DMS',     icon: '💬', desc: 'Responds only in private messages' },
    silent  : { label: 'SILENT',  icon: '🔇', desc: 'Responds only to the owner' },
    buttons : { label: 'BUTTONS', icon: '🔘', desc: 'Interactive button responses (overlay)' },
    channel : { label: 'CHANNEL', icon: '📡', desc: 'Replies as forwarded channel messages (overlay)' },
    default : { label: 'DEFAULT', icon: '📝', desc: 'Normal text responses — disables buttons & channel' },
};

function getCurrentMode() {
    return process.env.BOT_MODE || 'public';
}

module.exports = {
    name:        'mode',
    aliases:     ['botmode', 'setmode'],
    description: 'Change bot operating mode',
    category:    'owner',
    ownerOnly:   true,

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '⚙️', key: msg.key } }); } catch {}
        const botName = getBotName();

        if (!ctx.isOwner() && !ctx.isSudo()) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  MODE 〕\n║\n║ ▸ *Status* : ❌ Owner only command\n║\n╚═╝`
            }, { quoted: msg });
        }

        const H = '╔═|〔  BOT MODE 〕';
        const F = `╚═╝`;

        const input = (args[0] || '').toLowerCase().trim();

        // ── Status / no args ──────────────────────────────────────────────────
        if (!input) {
            const cur     = getCurrentMode();
            const curInfo = MODES[cur] || { icon: '❓', label: cur.toUpperCase() };
            const btnOn   = isButtonModeEnabled();
            const chnOn   = isChannelModeEnabled();
            const overlays = [btnOn ? '🔘 Buttons' : null, chnOn ? '📡 Channel' : null].filter(Boolean).join(' + ') || 'none';

            return sock.sendMessage(chatId, {
                text: [
                    H, `║`,
                    `║ ▸ *Current* : ${curInfo.icon} ${curInfo.label}`,
                    `║ ▸ *Overlays*: ${overlays}`,
                    `║`,
                    `║ ▸ *${prefix}mode public*   → everyone`,
                    `║ ▸ *${prefix}mode groups*   → groups only`,
                    `║ ▸ *${prefix}mode dms*      → DMs only`,
                    `║ ▸ *${prefix}mode silent*   → owner only`,
                    `║ ▸ *${prefix}mode buttons*  → toggle button responses`,
                    `║ ▸ *${prefix}mode channel*  → toggle channel forwarding`,
                    `║ ▸ *${prefix}mode default*  → reset to normal text`,
                    `║`,
                    F,
                ].join('\n')
            }, { quoted: msg });
        }

        if (!MODES[input]) {
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Status* : ❌ Unknown mode\n║ ▸ *Valid*  : public, groups, dms, silent,\n║   buttons, channel, default\n║\n╚═╝`
            }, { quoted: msg });
        }

        const modeInfo = MODES[input];

        // ── Buttons overlay ───────────────────────────────────────────────────
        if (input === 'buttons') {
            const nowOn = !isButtonModeEnabled();
            setButtonMode(nowOn);
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Overlay* : 🔘 Buttons\n║ ▸ *Status*  : ${nowOn ? '✅ Enabled' : '❌ Disabled'}\n║\n${F}`
            }, { quoted: msg });
        }

        // ── Channel overlay ───────────────────────────────────────────────────
        if (input === 'channel') {
            const nowOn = !isChannelModeEnabled();
            setChannelMode(nowOn);
            const chInfo = getChannelInfo();
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Overlay* : 📡 Channel\n║ ▸ *Status*  : ${nowOn ? '✅ Enabled' : '❌ Disabled'}\n${nowOn ? `║ ▸ *Channel* : ${chInfo.name}\n` : ''}║\n${F}`
            }, { quoted: msg });
        }

        // ── Default — reset overlays + set public ─────────────────────────────
        if (input === 'default') {
            setButtonMode(false);
            setChannelMode(false);
            await setConfig('MODE', 'public');
            process.env.BOT_MODE = 'public';
            if (typeof globalThis.updateBotModeCache === 'function') globalThis.updateBotModeCache('public');
            if (global.BOT_MODE !== undefined) global.BOT_MODE = 'public';
            return sock.sendMessage(chatId, {
                text: `${H}\n║\n║ ▸ *Mode*    : 📝 DEFAULT (public)\n║ ▸ *Buttons* : ❌ Off\n║ ▸ *Channel* : ❌ Off\n║ ▸ *Note*    : Normal text responses restored\n║\n${F}`
            }, { quoted: msg });
        }

        // ── Core modes: public / groups / dms / silent ────────────────────────
        await setConfig('MODE', input);
        process.env.BOT_MODE = input;
        if (typeof globalThis.updateBotModeCache === 'function') globalThis.updateBotModeCache(input);
        if (global.BOT_MODE !== undefined) global.BOT_MODE = input;

        return sock.sendMessage(chatId, {
            text: `${H}\n║\n║ ▸ *Mode*   : ${modeInfo.icon} ${modeInfo.label}\n║ ▸ *Effect* : ${modeInfo.desc}\n║\n${F}`
        }, { quoted: msg });
    }
};
