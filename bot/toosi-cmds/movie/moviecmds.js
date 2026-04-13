const { keithGet } = require('../../lib/keithapi');
const { getBotName } = require('../../lib/botname');

const dramahomeCmd = {
    name: 'dramahome',
    aliases: ['dramatrend', 'dramalist', 'dramabox'],
    description: 'Show latest and trending DramaBox movies',
    category: 'movie',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        try {
            await sock.sendMessage(chatId, { react: { text: '🎭', key: msg.key } });
            const data = await keithGet('/dramabox/home');
            if (!data.status || !data.result) throw new Error(data.error || 'No data');

            const trending = data.result.trending || [];
            const latest   = data.result.latest   || [];

            if (!trending.length && !latest.length) {
                return sock.sendMessage(chatId, {
                    text: `╔═|〔  🎭 DRAMABOX 〕\n║\n║ ▸ No trending or latest dramas available right now.\n║ ▸ Try: ${prefix}drama <search query>\n║\n╚═|〔 ${name} 〕`
                }, { quoted: msg });
            }

            let out = `╔═|〔  🎭 DRAMABOX TRENDING 〕\n║\n`;
            if (trending.length) {
                out += `║ 🔥 *Trending*\n`;
                out += trending.slice(0, 5).map((r, i) =>
                    `║ ▸ [${i + 1}] *${r.title}*\n║      👁️ ${(r.views || 0).toLocaleString()} views | ID: ${r.book_id}`
                ).join('\n');
                out += '\n║\n';
            }
            if (latest.length) {
                out += `║ 🆕 *Latest*\n`;
                out += latest.slice(0, 5).map((r, i) =>
                    `║ ▸ [${i + 1}] *${r.title}*\n║      👁️ ${(r.views || 0).toLocaleString()} views | ID: ${r.book_id}`
                ).join('\n');
                out += '\n║\n';
            }
            out += `╚═|〔 ${name} 〕`;
            await sock.sendMessage(chatId, { text: out }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 DRAMABOX 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const dramaCmd = {
    name: 'drama',
    aliases: ['dramasearch', 'dramaboxsearch', 'dbox'],
    description: 'Search DramaBox for any drama or series',
    category: 'movie',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎭 DRAMA SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}drama <title or keyword>\n║ ▸ *Example* : ${prefix}drama love in the city\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎭', key: msg.key } });
            const data = await keithGet('/dramabox/search', { q: query });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'No dramas found');
            const results = data.result.slice(0, 6);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}*\n║      👁️ ${(r.views || 0).toLocaleString()} views\n║      🆔 ID: \`${r.book_id}\``
            ).join('\n║\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 DRAMA SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎭 DRAMA SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const actorCmd = {
    name: 'actor',
    aliases: ['actress', 'actorsearch', 'celeb', 'cast'],
    description: 'Search for any movie actor or actress info',
    category: 'movie',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎬 ACTOR SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}actor <name>\n║ ▸ *Example* : ${prefix}actor will smith\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });
            const data = await keithGet('/actor/search', { q: query });
            if (!data.status || !data.result?.length) throw new Error(data.error || 'Actor not found');
            const results = data.result.slice(0, 5);
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.name}*\n║      🎭 ${r.knownFor || 'N/A'}\n║      🔗 ${r.detailUrl || 'N/A'}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 ACTOR SEARCH 〕\n║\n║ 🔍 *${query}*\n║\n${list}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 ACTOR SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const mboxCmd = {
    name: 'mbox',
    aliases: ['moviebox', 'movbox', 'boxmovie'],
    description: 'Search MovieBox for any movie or TV show',
    category: 'movie',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const query  = args.join(' ').trim();
        if (!query) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎥 MOVIEBOX SEARCH 〕\n║\n║ ▸ *Usage* : ${prefix}mbox <title>\n║ ▸ *Example* : ${prefix}mbox avengers\n║ ▸ *Tip* : Use ${prefix}trailer <moviebox-url> to get trailer\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎥', key: msg.key } });
            const data = await keithGet('/moviebox/search', { q: query });
            if (!data.status || !data.result?.results?.length) throw new Error(data.error || 'No movies found');
            const results = data.result.results.slice(0, 6);
            const total   = data.result.count || results.length;
            const list = results.map((r, i) =>
                `║ ▸ [${i + 1}] *${r.title}* [${r.type || 'movie'}]\n║      ⭐ ${r.rating || 'N/A'} | 🔗 ${r.url}`
            ).join('\n║\n');
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎥 MOVIEBOX SEARCH 〕\n║\n║ 🔍 *${query}* — ${total} results\n║\n${list}\n║\n║ 💡 *Tip* : Copy URL → use ${prefix}trailer <url>\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎥 MOVIEBOX SEARCH 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

const trailerCmd = {
    name: 'trailer',
    aliases: ['movietrailer', 'gettrailer', 'movtrailer'],
    description: 'Get movie trailer info — use a MovieBox URL or a movie name',
    category: 'movie',
    async execute(sock, msg, args, prefix, ctx) {
        const chatId = msg.key.remoteJid;
        const name   = getBotName();
        const input  = args.join(' ').trim();
        if (!input) return sock.sendMessage(chatId, {
            text: `╔═|〔  🎬 MOVIE TRAILER 〕\n║\n║ ▸ *Usage (URL)*  : ${prefix}trailer <moviebox.ph URL>\n║ ▸ *Usage (name)* : ${prefix}trailer avengers\n║ ▸ *Tip*          : ${prefix}mbox <title> to get URL first\n║\n╚═|〔 ${name} 〕`
        }, { quoted: msg });
        try {
            await sock.sendMessage(chatId, { react: { text: '🎬', key: msg.key } });

            let movieUrl = input;

            // If not a URL, auto-search moviebox to get the URL
            if (!input.startsWith('http')) {
                const search = await keithGet('/moviebox/search', { q: input });
                if (!search.status || !search.result?.results?.length) throw new Error('Movie not found in MovieBox');
                movieUrl = search.result.results[0].url;
            }

            const data = await keithGet('/movie/trailer', { q: movieUrl });
            if (!data.status || !data.result) throw new Error(data.error || 'Trailer not found');

            const r = data.result;
            const title  = r.title?.replace(/^Watch\s+/i, '').replace(/\s+Streaming Online.*/i, '') || 'Unknown';
            const desc   = (r.description || '').substring(0, 200);
            const banner =
                `╔═|〔  🎬 MOVIE TRAILER 〕\n║\n` +
                `║ ▸ *Title* : ${title}\n` +
                `║ ▸ *Link*  : ${r.url || movieUrl}\n` +
                (desc ? `║\n║ 📝 ${desc}${r.description?.length > 200 ? '...' : ''}\n║\n` : `║\n`) +
                `╚═|〔 ${name} 〕`;
            await sock.sendMessage(chatId, { text: banner }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🎬 MOVIE TRAILER 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n╚═|〔 ${name} 〕`
            }, { quoted: msg });
        }
    }
};

module.exports = [dramahomeCmd, dramaCmd, actorCmd, mboxCmd, trailerCmd];
