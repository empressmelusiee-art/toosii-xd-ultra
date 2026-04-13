const { execSync } = require('child_process');
const https = require('https');
const { getBotName } = require('../../lib/botname');

const REPO   = 'TOOSII102/toosii-xd-ultra';
const BRANCH = 'main';

function run(cmd, opts = {}) {
    return execSync(cmd, { encoding: 'utf8', timeout: 120000, stdio: 'pipe', ...opts }).trim();
}

function getCurrentCommit() {
    try { return run('git rev-parse HEAD'); } catch { return null; }
}

async function getLatestCommit() {
    return new Promise((resolve, reject) => {
        const url = `https://api.github.com/repos/${REPO}/commits/${BRANCH}`;
        https.get(url, { headers: { 'User-Agent': 'TOOSII-XD-Bot' } }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ sha: json.sha, message: json.commit?.message?.split('\n')[0] || '' });
                } catch { reject(new Error('Failed to parse GitHub response')); }
            });
        }).on('error', reject);
    });
}

module.exports = {
    name:        'update',
    aliases:     ['upgrade', 'pullupdate'],
    description: 'Pull latest changes from GitHub and restart the bot',
    category:    'owner',
    ownerOnly:   true,

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: msg.key } }); } catch {}
        const botName = getBotName();
        const foot    = `╚═|〔 ${botName} 〕`;

        if (!ctx?.isOwnerUser && !ctx?.isSudoUser) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Owner only\n║\n${foot}`
            }, { quoted: msg });
        }

        // ── Do everything silently, send ONE final result ─────────────────────
        let latest, pullErr, npmErr;
        const current = getCurrentCommit();

        try { latest = await getLatestCommit(); }
        catch (err) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ GitHub unreachable\n║ ▸ *Reason* : ${err.message}\n║\n${foot}`
            }, { quoted: msg });
        }

        const shortLatest  = latest.sha?.slice(0, 7) || 'unknown';
        const shortCurrent = current?.slice(0, 7)     || 'unknown';

        // Already up to date
        if (current && latest.sha && current === latest.sha) {
            return sock.sendMessage(chatId, {
                text: [
                    `╔═|〔  UPDATE 〕`,
                    `║`,
                    `║ ▸ *Status*  : ✅ Already up to date`,
                    `║ ▸ *Commit*  : ${shortCurrent}`,
                    `║ ▸ *Changes* : ${latest.message}`,
                    `║`,
                    `${foot}`,
                ].join('\n')
            }, { quoted: msg });
        }

        // git pull
        try {
            run(`git fetch origin ${BRANCH}`);
            run(`git reset --hard origin/${BRANCH}`);
        } catch (err) { pullErr = err.message?.slice(0, 100); }

        if (pullErr) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  UPDATE 〕\n║\n║ ▸ *Status* : ❌ Pull failed\n║ ▸ *Reason* : ${pullErr}\n║\n${foot}`
            }, { quoted: msg });
        }

        // npm install (silent, non-fatal)
        try { run('npm install --production', { cwd: process.cwd() }); }
        catch (e) { npmErr = true; }

        // ── Single final message ──────────────────────────────────────────────
        await sock.sendMessage(chatId, {
            text: [
                `╔═|〔  UPDATE 〕`,
                `║`,
                `║ ▸ *Status*  : ✅ Updated successfully`,
                `║ ▸ *From*    : ${shortCurrent}`,
                `║ ▸ *To*      : ${shortLatest}`,
                `║ ▸ *Changes* : ${latest.message}`,
                `║ ▸ *Deps*    : ${npmErr ? '⚠️ npm had warnings' : '✅ Installed'}`,
                `║`,
                `║ ▸ 🔄 Restarting in 3s...`,
                `║`,
                `${foot}`,
            ].join('\n')
        }, { quoted: msg });

        setTimeout(() => process.exit(0), 3000);
    },
};
