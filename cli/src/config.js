/**
 * config.js — Config phía user: chỉ lưu projectRoot (optional)
 *
 * Server URL được hardcode — user không cần biết / thiết lập.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// URL server ant-go — đổi thành production URL khi deploy
const API_URL = 'http://localhost:3000';

const CONFIG_DIR  = path.join(os.homedir(), '.ant-go');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return {}; }
}

function saveConfig(data) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const current = loadConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...data }, null, 2));
}

module.exports = { API_URL, loadConfig, saveConfig, CONFIG_FILE };
