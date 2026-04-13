/**
   * TOOSII-XD — Settings / Config Store
   * Lightweight JSON-file persistence. No native modules needed.
   * Stores all bot settings in data/config.json
   */
  const fs   = require('fs');
  const path = require('path');

  const DATA_DIR  = path.join(__dirname, '../data');
  const DB_FILE   = path.join(DATA_DIR, 'config.json');
  const WARN_FILE = path.join(DATA_DIR, 'warnings.json');

  function _ensureDir() {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  function _load(file) {
      try {
          if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {}
      return {};
  }

  function _save(file, data) {
      _ensureDir();
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  }

  // ── Config (settings) ────────────────────────────────────────────────────────
  async function initTables() { _ensureDir(); }

  async function getConfig(key, defaultValue) {
      const data = _load(DB_FILE);
      return key in data ? data[key] : (defaultValue !== undefined ? defaultValue : null);
  }

  async function setConfig(key, value) {
      const data = _load(DB_FILE);
      data[key] = value;
      _save(DB_FILE, data);
      return true;
  }

  async function getAllConfig() {
      return _load(DB_FILE);
  }

  async function deleteConfig(key) {
      const data = _load(DB_FILE);
      delete data[key];
      _save(DB_FILE, data);
      return true;
  }

  // ── Warnings ─────────────────────────────────────────────────────────────────
  async function getWarnings(jid) {
      const data = _load(WARN_FILE);
      return data[jid] || 0;
  }

  async function addWarning(jid) {
      const data = _load(WARN_FILE);
      data[jid] = (data[jid] || 0) + 1;
      _save(WARN_FILE, data);
      return data[jid];
  }

  async function resetWarnings(jid) {
      const data = _load(WARN_FILE);
      delete data[jid];
      _save(WARN_FILE, data);
      return true;
  }

  // ── Stubs kept for compatibility ──────────────────────────────────────────────
  async function uploadMedia() { return null; }
  async function migrateJSONToConfig() {}
  function getClient() { return null; }
  function setConfigBotId(id) {}

  module.exports = {
      initTables, getConfig, setConfig, getAllConfig, deleteConfig,
      getWarnings, addWarning, resetWarnings,
      uploadMedia, migrateJSONToConfig, getClient, setConfigBotId,
  };
  