/**
 * config.js — Config phía user: lưu projectRoot (optional) và auth session
 *
 * Server URL được hardcode — user không cần biết / thiết lập.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const API_URL = process.env.ANT_GO_API_URL || 'https://antgo.work';

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
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...data }, null, 2), { mode: 0o600 });
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getAuth() {
  return loadConfig().auth ?? null;
}

function setAuth(data) {
  saveConfig({ auth: data });
}

function clearAuth() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const current = loadConfig();
  delete current.auth;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(current, null, 2), { mode: 0o600 });
}

function isLoggedIn() {
  const session = getAuth();
  if (!session?.token) return false;
  if (!session.expiresAt) return true;
  return new Date(session.expiresAt) > new Date();
}

function getLang() {
  return loadConfig().lang === 'en' ? 'en' : 'vi';
}

function setLang(lang) {
  saveConfig({ lang });
}

function isFirstRun() {
  return !loadConfig().firstRunDone;
}

function markFirstRunDone() {
  saveConfig({ firstRunDone: true });
}

module.exports = { API_URL, loadConfig, saveConfig, CONFIG_FILE, getAuth, setAuth, clearAuth, isLoggedIn, getLang, setLang, isFirstRun, markFirstRunDone };
