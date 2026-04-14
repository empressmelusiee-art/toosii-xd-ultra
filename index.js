// Launcher + process manager
  // Pterodactyl always sees this process running — it never exits.
  // The bot itself runs as a child. Exit code 1 = restart, 0 = stop.
  'use strict';
  const path  = require('path');
  const fs    = require('fs');
  const https = require('https');
  const { spawn } = require('child_process');

  const BOT_DIR    = path.join(__dirname, 'bot');
  const YT_DLP     = path.join(BOT_DIR, 'yt-dlp');
  const YT_DLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

  function download(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      const get  = (u) => https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
      get(url);
    });
  }

  async function ensureYtDlp() {
    if (fs.existsSync(YT_DLP)) return;
    console.log('[launcher] yt-dlp missing — downloading latest...');
    await download(YT_DLP_URL, YT_DLP);
    fs.chmodSync(YT_DLP, '755');
    console.log('[launcher] yt-dlp ready.');
  }

  function startBot() {
    console.log('[launcher] Starting bot...');
    const bot = spawn(process.execPath, [path.join(__dirname, 'bot', 'index.js')], {
      stdio: 'inherit',
      env:   process.env,
      cwd:   BOT_DIR,
    });

    bot.on('exit', (code) => {
      if (code === 1) {
        console.log('[launcher] Bot exited with code 1 — restarting in 3s...');
        setTimeout(startBot, 3000);
      } else {
        console.log(`[launcher] Bot stopped (code ${code}). Launcher staying alive.`);
      }
    });
  }

  ensureYtDlp()
    .catch((err) => console.error('[launcher] yt-dlp download failed:', err.message))
    .finally(startBot);
  