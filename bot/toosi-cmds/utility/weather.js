'use strict';

const { getBotName } = require('../../lib/botname');

module.exports = {
    name: 'weather',
    aliases: ['wthr', 'forecast', 'clima'],
    description: 'Get current weather for any city',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();

        try { await sock.sendMessage(chatId, { react: { text: '🌤️', key: msg.key } }); } catch {}

        const city = args.join(' ').trim();
        if (!city) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  WEATHER 〕\n║\n║ ▸ *Usage* : ${prefix}weather <city>\n║ ▸ *Example*: ${prefix}weather Nairobi\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }

        try {
            const res  = await fetch(
                `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
                { signal: AbortSignal.timeout(15000) }
            );
            if (!res.ok) throw new Error(`City not found`);
            const data = await res.json();

            const cur  = data.current_condition?.[0];
            const area = data.nearest_area?.[0];
            const loc  = area?.areaName?.[0]?.value || city;
            const coun = area?.country?.[0]?.value || '';

            const tempC  = cur?.temp_C || '?';
            const tempF  = cur?.temp_F || '?';
            const feels  = cur?.FeelsLikeC || '?';
            const humid  = cur?.humidity || '?';
            const wind   = cur?.windspeedKmph || '?';
            const desc   = cur?.weatherDesc?.[0]?.value || '?';
            const uv     = cur?.uvIndex || '?';

            const weatherEmoji = {
                'Sunny': '☀️', 'Clear': '🌙', 'Partly cloudy': '⛅', 'Cloudy': '☁️',
                'Overcast': '☁️', 'Rain': '🌧️', 'Drizzle': '🌦️', 'Thunder': '⛈️',
                'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️'
            }[desc] || '🌡️';

            await sock.sendMessage(chatId, {
                text: `╔═|〔  WEATHER 〕\n║\n║ ▸ *City*    : ${loc}, ${coun}\n║ ▸ *Temp*    : ${tempC}°C / ${tempF}°F\n║ ▸ *Feels*   : ${feels}°C\n║ ▸ *Sky*     : ${weatherEmoji} ${desc}\n║ ▸ *Humidity*: ${humid}%\n║ ▸ *Wind*    : ${wind} km/h\n║ ▸ *UV Index*: ${uv}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  WEATHER 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};
