/**
 * auth.js — `ant auth` commands
 */

const http    = require('http');
const crypto  = require('crypto');
const { exec } = require('child_process');
const axios   = require('axios');
const chalk   = require('chalk');
const ora     = require('ora');
const inquirer = require('inquirer');

const { API_URL, getAuth, setAuth, clearAuth, isLoggedIn } = require('../config');
const { t, tError } = require('../i18n');

// ── login ─────────────────────────────────────────────────────────────────────

async function loginCommand({ browser = false } = {}) {
  if (isLoggedIn()) {
    const session = getAuth();
    console.log('');
    console.log(chalk.yellow(t('alreadyLoggedIn', session.email)));
    console.log(chalk.gray('  ' + t('logoutHint')));
    console.log('');
    return;
  }
  if (browser) return browserLoginFlow();
  return emailLoginFlow();
}

async function emailLoginFlow() {
  console.log('');
  console.log(chalk.bold(t('loginTitle')));
  console.log(chalk.gray('  ' + t('loginBrowserHint')));
  console.log('');

  const { email, password } = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: t('loginEmailLabel'),
      validate: (v) => (v.includes('@') ? true : t('loginEmailInvalid')),
    },
    {
      type: 'password',
      name: 'password',
      message: t('loginPasswordLabel'),
      mask: '•',
    },
  ]);

  const spinner = ora(t('loginLoading')).start();

  try {
    const { data } = await axios.post(`${API_URL}/api/auth/cli-login`, { email, password });

    setAuth({
      token:        data.cliToken,
      refreshToken: data.refreshToken,
      expiresAt:    data.expiresAt,
      uid:          data.uid,
      email:        data.email,
      displayName:  data.displayName,
      photoURL:     data.photoURL,
      plan:         data.plan,
      builds:       data.builds,
      credits:      data.credits,
      planCredits:  data.planCredits,
    });

    spinner.succeed(t('loginSuccess'));
    printUserInfo(data);
  } catch (err) {
    spinner.fail(t('loginFailed'));
    const raw = err.response?.data?.error ?? err.message;
    console.error(chalk.red(`  ✖  ${tError(raw)}`));
    console.log('');
    console.log(chalk.yellow(`  ${t('loginNoAccount')}`));
    console.log(`  ${t('loginRegisterAt')} ${chalk.cyan('https://antgo.work/register')}`);
    console.log('');
    process.exit(1);
  }
}

async function browserLoginFlow() {
  const state = crypto.randomBytes(16).toString('hex');
  const port  = await findAvailablePort(9005);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error(t('browserTimeout')));
    }, 5 * 60 * 1000);

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname !== '/callback') { res.writeHead(404); res.end('Not found'); return; }

      const receivedState = url.searchParams.get('state');
      if (receivedState !== state) { res.writeHead(400); res.end('Invalid state'); return; }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f0c29;color:#fff">
          <h2 style="color:#a78bfa">${t('browserSuccess')}</h2>
          <p style="color:#9ca3af">${t('browserSuccessClose')}</p>
        </body></html>
      `);

      clearTimeout(timeout);
      server.close();

      setAuth({
        token:        url.searchParams.get('token'),
        refreshToken: url.searchParams.get('refreshToken') || null,
        expiresAt:    url.searchParams.get('expiresAt'),
        uid:          url.searchParams.get('uid'),
        email:        url.searchParams.get('email'),
        displayName:  url.searchParams.get('displayName') || null,
        photoURL:     url.searchParams.get('photoURL') || null,
        plan:         url.searchParams.get('plan') || 'free',
        builds:       parseInt(url.searchParams.get('builds') || '0', 10),
        credits:      parseFloat(url.searchParams.get('credits') || '15'),
        planCredits:  parseInt(url.searchParams.get('planCredits') || '15', 10),
      });

      const session = getAuth();
      console.log('');
      console.log(chalk.green(t('browserSuccess')));
      printUserInfo(session);
      resolve();
    });

    server.listen(port, () => {
      const loginUrl = `${API_URL}/auth/cli?port=${port}&state=${state}`;
      console.log('');
      console.log(t('browserOpening'));
      console.log(chalk.gray(`  ${t('browserManual')} ${loginUrl}`));
      openBrowser(loginUrl);
    });

    server.on('error', reject);
  });
}

// ── logout ────────────────────────────────────────────────────────────────────

async function logoutCommand() {
  const session = getAuth();
  if (!session?.token) {
    console.log('');
    console.log(chalk.yellow(t('notLoggedIn')));
    console.log('');
    return;
  }

  try {
    await axios.delete(`${API_URL}/api/auth/cli-token`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
  } catch {}

  clearAuth();
  console.log('');
  console.log(chalk.green(t('logoutSuccess')));
  console.log('');
}

// ── whoami ────────────────────────────────────────────────────────────────────

async function whoamiCommand() {
  const session = getAuth();
  if (!session?.token) {
    console.log('');
    console.log(chalk.yellow(t('notLoggedIn')));
    console.log(chalk.gray('  ' + t('runLoginHint')));
    console.log('');
    return;
  }

  const isExpired = session.expiresAt && new Date(session.expiresAt) < new Date();

  console.log('');
  console.log(chalk.bold(t('whoamiTitle')));
  console.log('');
  console.log(`  ${chalk.gray(t('whoamiEmail'))}     ${session.email ?? '-'}`);
  if (session.displayName) {
    console.log(`  ${chalk.gray(t('whoamiName'))}       ${session.displayName}`);
  }
  console.log(`  ${chalk.gray(t('whoamiPlan'))}      ${chalk.cyan(session.plan ?? 'free')}`);
  if (session.credits != null) {
    console.log(`  ${chalk.gray(t('whoamiCredits'))}   ${session.credits} / ${session.planCredits ?? '-'}`);
  }
  if (isExpired) {
    console.log(`  ${chalk.gray(t('whoamiExpires'))}  ${chalk.red(t('whoamiExpired'))}`);
  } else if (session.expiresAt) {
    console.log(`  ${chalk.gray(t('whoamiExpires'))}  ${new Date(session.expiresAt).toLocaleString()}`);
  }
  console.log('');
}

// ── ensureToken ───────────────────────────────────────────────────────────────

async function ensureToken() {
  if (isLoggedIn()) return getAuth().token;

  const session = getAuth();

  if (session?.refreshToken) {
    const spinner = ora(t('sessionRenewing')).start();
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/cli-refresh`, {
        refreshToken: session.refreshToken,
      });
      setAuth({
        token:        data.cliToken,
        refreshToken: data.refreshToken,
        expiresAt:    data.expiresAt,
        uid:          data.uid,
        email:        data.email,
        displayName:  data.displayName,
        photoURL:     data.photoURL,
        plan:         data.plan,
        builds:       data.builds,
        credits:      data.credits,
        planCredits:  data.planCredits,
      });
      spinner.succeed(t('sessionRenewed'));
      return data.cliToken;
    } catch {
      spinner.fail(t('sessionRenewFailed'));
    }
  }

  console.log('');
  console.log(chalk.red(`✖  ${t('sessionExpired')}`));
  console.log(chalk.gray(`   ${t('runLoginHint')}`));
  console.log('');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function printUserInfo(data) {
  console.log('');
  console.log(`  ${chalk.gray(t('whoamiEmail'))}     ${data.email ?? '-'}`);
  if (data.displayName) {
    console.log(`  ${chalk.gray(t('whoamiName'))}       ${data.displayName}`);
  }
  console.log(`  ${chalk.gray(t('whoamiPlan'))}      ${chalk.cyan(data.plan ?? 'free')}`);
  if (data.credits != null) {
    console.log(`  ${chalk.gray(t('whoamiCredits'))}   ${data.credits} / ${data.planCredits ?? '-'}`);
  }
  console.log('');
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32'  ? `start "" "${url}"` :
                                    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(chalk.gray(`  ${t('browserManual')} ${url}`));
  });
}

function findAvailablePort(preferred) {
  return new Promise((resolve) => {
    const srv = http.createServer();
    srv.listen(preferred, () => srv.close(() => resolve(preferred)));
    srv.on('error', () => resolve(preferred + Math.floor(Math.random() * 100) + 1));
  });
}

module.exports = { loginCommand, logoutCommand, whoamiCommand, ensureToken };
