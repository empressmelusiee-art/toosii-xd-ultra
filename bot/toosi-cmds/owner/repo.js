const https   = require('https');
const { execSync } = require('child_process');
const { getBotName } = require('../../lib/botname');

const OWN_REPO   = 'TOOSII102/toosii-xd-ultra';
const OWN_BRANCH = 'main';

// ── Helpers ────────────────────────────────────────────────────────────────

function run(cmd) {
    try { return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', timeout: 8000 }).trim(); }
    catch { return null; }
}

function fmtDate(d) {
    if (!d) return 'N/A';
    try { return new Date(d).toDateString(); } catch { return d; }
}

function num(n) {
    if (n == null) return 'N/A';
    return Number(n).toLocaleString();
}

function trunc(s, n = 70) {
    if (!s) return 'N/A';
    return String(s).length > n ? String(s).substring(0, n) + '…' : String(s);
}

function ghGet(path) {
    return new Promise((resolve, reject) => {
        const url = 'https://api.github.com' + path;
        https.get(url, { headers: { 'User-Agent': 'TOOSII-XD-Bot', Accept: 'application/vnd.github+json' } }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
                catch { reject(new Error('Parse error')); }
            });
        }).on('error', reject);
    });
}

// Normalise input → 'owner/repo'  (handles full GH url or short form)
function parseRepo(input) {
    if (!input) return OWN_REPO;
    const match = input.match(/github\.com\/([^\/\s]+\/[^\/\s?#]+)/i);
    if (match) return match[1].replace(/\.git$/, '');
    if (/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(input)) return input;
    return null;
}

// ── Local git data (for the bot's own repo) ────────────────────────────────

function localGitInfo() {
    const sha     = run('git rev-parse HEAD')?.slice(0, 7) || 'unknown';
    const branch  = run('git branch --show-current') || OWN_BRANCH;
    const count   = run('git rev-list --count HEAD') || '?';
    const rawLog  = run('git log --oneline -5') || '';
    const commits = rawLog.split('\n').filter(Boolean).map(l => {
        const [hash, ...rest] = l.split(' ');
        return { hash, msg: rest.join(' ') };
    });
    return { sha, branch, count, commits };
}

// ── Command ────────────────────────────────────────────────────────────────

module.exports = {
    name: 'repo',
    aliases: ['botrepo', 'repository', 'gitinfo', 'repostats'],
    description: 'Show GitHub repo info — .repo [owner/name or url] (default: bot repo)',
    category: 'owner',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        const botName = getBotName();
        const foot    = `╚═|〔 ${botName} 〕`;
        const input   = args[0] || null;
        const repoSlug = parseRepo(input);

        if (input && !repoSlug) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  🐙 REPO INFO 〕\n║\n║ ▸ *Usage*  : ${prefix}repo [owner/name or github-url]\n║ ▸ *Tip*    : leave blank to show the bot's own repo\n║\n${foot}`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '🐙', key: msg.key } });

            const isOwnRepo = repoSlug === OWN_REPO;

            // ── Fetch GitHub API data ──────────────────────────────────────
            const [repoRes, commitsRes] = await Promise.all([
                ghGet(`/repos/${repoSlug}`),
                ghGet(`/repos/${repoSlug}/commits?per_page=5`),
            ]);

            const ghOk      = repoRes.status === 200;
            const r         = ghOk ? repoRes.data : null;
            const rawCommits = (commitsRes.status === 200 && Array.isArray(commitsRes.data)) ? commitsRes.data : [];
            const latestCommits = rawCommits.slice(0, 5).map(c => ({
                hash: c.sha?.slice(0, 7),
                msg:  trunc(c.commit?.message?.split('\n')[0], 55),
                by:   c.commit?.author?.name,
                date: fmtDate(c.commit?.author?.date),
            }));

            // ── For own repo, also pull local git data ─────────────────────
            const local = isOwnRepo ? localGitInfo() : null;

            // ── Build output ───────────────────────────────────────────────
            let lines = [];

            if (isOwnRepo) {
                // ── Own bot repo — clean CTA card ─────────────────────────
                const stars = ghOk ? num(r.stargazers_count) : '—';
                lines = [
                    `╔═|〔  🤖 TOOSII-XD ULTRA 〕`,
                    `║`,
                    `║ ⭐ *Stars* : ${stars}`,
                    `║`,
                    `║ 🔗 https://github.com/${OWN_REPO}`,
                    `║`,
                    `║ ⭐ *Star the repo if you love this bot!*`,
                    `║ 🍴 *Fork & deploy your own instance*`,
                    `║ 📲 *Share with friends — it's free!*`,
                    `║`,
                    foot,
                ];
            } else if (ghOk && r) {
                // ── External repo — clean stats view ──────────────────────
                const topics = Array.isArray(r.topics) && r.topics.length ? r.topics.slice(0, 5).join(', ') : 'N/A';
                lines = [
                    `╔═|〔  🐙 REPO INFO 〕`,
                    `║`,
                    `║ ▸ *Repo*    : ${r.full_name}`,
                    `║ ▸ *About*   : ${trunc(r.description, 75)}`,
                    `║ ▸ *Language*: ${r.language || 'N/A'}`,
                    `║ ▸ *License* : ${r.license?.name || 'N/A'}`,
                    `║ ▸ *Topics*  : ${topics}`,
                    `║`,
                    `║ 📊 *Stats*`,
                    `║ ▸ ⭐ Stars    : ${num(r.stargazers_count)}`,
                    `║ ▸ 🍴 Forks    : ${num(r.forks_count)}`,
                    `║ ▸ 👁️  Watchers : ${num(r.subscribers_count)}`,
                    `║ ▸ 🐛 Issues   : ${num(r.open_issues_count)}`,
                    `║`,
                    `║ 📅 *Activity*`,
                    `║ ▸ Created : ${fmtDate(r.created_at)}`,
                    `║ ▸ Updated : ${fmtDate(r.updated_at)}`,
                    `║`,
                    `║ 🔗 https://github.com/${repoSlug}`,
                    `║`,
                    foot,
                ];
            } else {
                throw new Error(`Repo "${repoSlug}" not found or is private`);
            }

            await sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(chatId, {
                text: `╔═|〔  🐙 REPO INFO 〕\n║\n║ ▸ *Status* : ❌ Failed\n║ ▸ *Reason* : ${e.message}\n║\n${foot}`
            }, { quoted: msg });
        }
    }
};
