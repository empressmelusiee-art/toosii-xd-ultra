/**
   * TOOSII-XD — Health Check Web Server
   * Required for Render, Railway, Koyeb to keep the bot alive.
   */
  const http = require('http');
  const cfg  = require('../config');

  let _status = { state: 'starting', uptime: 0, startTime: Date.now() };

  async function setupWebServer() {
      const PORT = cfg.PORT || process.env.PORT || 3000;
      const server = http.createServer((req, res) => {
          const up = Math.floor((Date.now() - _status.startTime) / 1000);
          const body = JSON.stringify({
              bot:    cfg.BOT_NAME,
              status: _status.state,
              uptime: `${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m`,
              ..._status,
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(body);
      });
      server.listen(PORT, () => console.log(`🌐 Health server running on port ${PORT}`));
      return server;
  }

  function updateWebStatus(data) {
      _status = { ..._status, ...data };
  }

  module.exports = { setupWebServer, updateWebStatus };
  