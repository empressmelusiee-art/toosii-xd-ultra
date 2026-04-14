'use strict';

const { getBotName } = require('../../lib/botname');

const CG = 'https://api.coingecko.com/api/v3';

async function cgFetch(path) {
    const res = await fetch(`${CG}${path}`, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'ToosiiBot/1.0', 'Accept': 'application/json' }
    });
    if (res.status === 429) throw new Error('Rate limited — try again in 30 seconds');
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    return res.json();
}

// Resolve coin name/symbol to CoinGecko ID
const KNOWN = {
    btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', sol: 'solana',
    xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', shib: 'shiba-inu',
    dot: 'polkadot', matic: 'matic-network', ltc: 'litecoin', avax: 'avalanche-2',
    link: 'chainlink', uni: 'uniswap', atom: 'cosmos', trx: 'tron',
    near: 'near', algo: 'algorand', xlm: 'stellar', vet: 'vechain',
    pepe: 'pepe', floki: 'floki', ton: 'the-open-network', apt: 'aptos',
    arb: 'arbitrum', op: 'optimism', inj: 'injective-protocol', sui: 'sui',
};

async function resolveId(query) {
    const q = query.toLowerCase().trim();
    if (KNOWN[q]) return { id: KNOWN[q], name: q.toUpperCase() };
    // Try as direct ID first
    try {
        const d = await cgFetch(`/simple/price?ids=${encodeURIComponent(q)}&vs_currencies=usd`);
        if (d[q]) return { id: q, name: q };
    } catch {}
    // Search by name
    const data = await cgFetch(`/search?query=${encodeURIComponent(q)}`);
    const coin  = data.coins?.[0];
    if (!coin) throw new Error(`Coin not found: "${query}"`);
    return { id: coin.id, name: coin.name };
}

function arrow(n) {
    if (n > 0)  return `📈 +${n.toFixed(2)}%`;
    if (n < 0)  return `📉 ${n.toFixed(2)}%`;
    return `➡️ 0.00%`;
}

function fmt(n) {
    if (n == null) return 'N/A';
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (n >= 1)    return `$${n.toFixed(4)}`;
    return `$${n.toFixed(8)}`;
}

module.exports = [
    {
        name: 'crypto',
        aliases: ['coin', 'coinprice', 'cryptoprice', 'price', 'cryptocheck'],
        description: 'Live cryptocurrency price — .crypto <coin>',
        category: 'utility',

        async execute(sock, msg, args, prefix) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            try { await sock.sendMessage(chatId, { react: { text: '💰', key: msg.key } }); } catch {}

            const query = args.join(' ').trim();
            if (!query) {
                return sock.sendMessage(chatId, {
                    text: [
                        `╔═|〔  CRYPTO 💰 〕`,
                        `║`,
                        `║ ▸ *Usage*   : ${prefix}crypto <coin>`,
                        `║ ▸ *Example* : ${prefix}crypto bitcoin`,
                        `║ ▸ *Example* : ${prefix}crypto BTC`,
                        `║ ▸ *Example* : ${prefix}crypto doge`,
                        `║`,
                        `║ ▸ *Multi*   : ${prefix}cryptotop — top 10 by market cap`,
                        `║`,
                        `╚═╝`,
                    ].join('\n')
                }, { quoted: msg });
            }

            try {
                const { id } = await resolveId(query);
                const [market] = await cgFetch(
                    `/coins/markets?vs_currency=usd&ids=${id}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=1h,24h,7d`
                );
                if (!market) throw new Error('No price data found');

                const c = market;
                const lines = [
                    `╔═|〔  CRYPTO 💰 〕`,
                    `║`,
                    `║ ▸ *Coin*       : ${c.name} (${(c.symbol || '').toUpperCase()})`,
                    `║ ▸ *Rank*       : #${c.market_cap_rank ?? 'N/A'}`,
                    `║`,
                    `║ ▸ *Price*      : ${fmt(c.current_price)}`,
                    `║ ▸ *1h Change*  : ${arrow(c.price_change_percentage_1h_in_currency)}`,
                    `║ ▸ *24h Change* : ${arrow(c.price_change_percentage_24h)}`,
                    `║ ▸ *7d Change*  : ${arrow(c.price_change_percentage_7d_in_currency)}`,
                    `║`,
                    `║ ▸ *Market Cap* : ${fmt(c.market_cap)}`,
                    `║ ▸ *Volume 24h* : ${fmt(c.total_volume)}`,
                    `║ ▸ *24h High*   : ${fmt(c.high_24h)}`,
                    `║ ▸ *24h Low*    : ${fmt(c.low_24h)}`,
                    `║ ▸ *Supply*     : ${c.circulating_supply ? Number(c.circulating_supply).toLocaleString() : 'N/A'} ${(c.symbol || '').toUpperCase()}`,
                    `║ ▸ *ATH*        : ${fmt(c.ath)}`,
                    `║`,
                    `║ ⏱️ Live via CoinGecko`,
                    `║`,
                    `╚═╝`,
                ].join('\n');

                await sock.sendMessage(chatId, { text: lines }, { quoted: msg });

            } catch (e) {
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  CRYPTO 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═╝`
                }, { quoted: msg });
            }
        }
    },

    {
        name: 'cryptotop',
        aliases: ['topcrypto', 'topcoins', 'cryptolist', 'coinlist'],
        description: 'Top 10 cryptocurrencies by market cap — .cryptotop',
        category: 'utility',

        async execute(sock, msg, args, prefix) {
            const chatId = msg.key.remoteJid;
            const name   = getBotName();
            try { await sock.sendMessage(chatId, { react: { text: '📊', key: msg.key } }); } catch {}

            try {
                const coins = await cgFetch(
                    `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false`
                );
                if (!coins?.length) throw new Error('No data returned');

                const list = coins.map((c, i) => {
                    const ch  = c.price_change_percentage_24h;
                    const dir = ch > 0 ? '📈' : ch < 0 ? '📉' : '➡️';
                    return `║ *${i + 1}.* ${c.name} (${(c.symbol || '').toUpperCase()})\n║    ${fmt(c.current_price)}  ${dir} ${ch != null ? ch.toFixed(2) + '%' : 'N/A'}`;
                }).join('\n║\n');

                await sock.sendMessage(chatId, {
                    text: `╔═|〔  TOP 10 CRYPTO 📊 〕\n║\n${list}\n║\n║ 💡 ${prefix}crypto <coin> for details\n║\n╚═╝`
                }, { quoted: msg });

            } catch (e) {
                await sock.sendMessage(chatId, {
                    text: `╔═|〔  CRYPTO TOP 〕\n║\n║ ▸ *Status* : ❌ ${e.message}\n║\n╚═╝`
                }, { quoted: msg });
            }
        }
    }
];
