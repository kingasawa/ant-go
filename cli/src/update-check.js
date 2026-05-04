/**
 * update-check.js — Check for newer version on npm registry.
 * Runs in background, prints hint after command completes.
 * Result is cached for 24h to avoid hitting npm on every run.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');

const PKG_NAME   = 'ant-go';
const CACHE_DIR  = path.join(os.homedir(), '.ant-go');
const CACHE_FILE = path.join(CACHE_DIR, 'update-check.json');
const TTL_MS     = 24 * 60 * 60 * 1000; // 24h

function getCurrentVersion() {
  return require('../package.json').version;
}

function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Date.now() - data.checkedAt < TTL_MS) return data;
    return null;
  } catch {
    return null;
  }
}

function saveCache(latestVersion) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ latestVersion, checkedAt: Date.now() }, null, 2));
  } catch {}
}

function fetchLatestVersion() {
  return new Promise((resolve) => {
    const req = https.get(
      `https://registry.npmjs.org/${PKG_NAME}/latest`,
      { headers: { Accept: 'application/json' }, timeout: 3000 },
      (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(body).version); }
          catch { resolve(null); }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function isNewer(latest, current) {
  const parse = v => v.split('.').map(Number);
  const [lMaj, lMin, lPat] = parse(latest);
  const [cMaj, cMin, cPat] = parse(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

/**
 * Call this at the start of a command.
 * Returns a function — call it at the END of the command to print the hint.
 *
 * Usage:
 *   const showUpdateHint = startUpdateCheck();
 *   // ... do work ...
 *   await showUpdateHint();
 */
function startUpdateCheck() {
  const current = getCurrentVersion();

  // Kick off check in background (non-blocking)
  const resultPromise = (async () => {
    const cached = loadCache();
    if (cached) return cached.latestVersion;
    const latest = await fetchLatestVersion();
    if (latest) saveCache(latest);
    return latest;
  })();

  return async function showUpdateHint() {
    try {
      const latest = await resultPromise;
      if (latest && isNewer(latest, current)) {
        const chalk = require('chalk');
        console.log('');
        console.log(
          chalk.yellow('  ┌─────────────────────────────────────────────────────┐')
        );
        console.log(
          chalk.yellow('  │') +
          chalk.bold(`  Update available: ${chalk.gray(current)} → ${chalk.green(latest)}`) +
          chalk.yellow('  │')
        );
        console.log(
          chalk.yellow('  │') +
          `  Run: ${chalk.cyan('npm install -g ant-go')} to upgrade` +
          chalk.yellow('          │')
        );
        console.log(
          chalk.yellow('  └─────────────────────────────────────────────────────┘')
        );
        console.log('');
      }
    } catch {}
  };
}

module.exports = { startUpdateCheck };

