/**
 * auth.js — `ant auth` commands
 *
 * login:   email/password (mặc định) hoặc --browser cho Google OAuth
 * logout:  revoke token + xóa config
 * whoami:  hiển thị thông tin tài khoản đang đăng nhập
 */

const http    = require('http');
const crypto  = require('crypto');
const { exec } = require('child_process');
const axios   = require('axios');
const chalk   = require('chalk');
const ora     = require('ora');
const inquirer = require('inquirer');

const { API_URL, getAuth, setAuth, clearAuth, isLoggedIn } = require('../config');

// ── login ─────────────────────────────────────────────────────────────────────

async function loginCommand({ browser = false } = {}) {
  if (isLoggedIn()) {
    const session = getAuth();
    console.log('');
    console.log(chalk.yellow(`Bạn đã đăng nhập với tài khoản: ${chalk.bold(session.email)}`));
    console.log(chalk.gray('  Chạy `ant auth logout` nếu muốn đăng nhập tài khoản khác.'));
    console.log('');
    return;
  }

  if (browser) {
    return browserLoginFlow();
  }
  return emailLoginFlow();
}

async function emailLoginFlow() {
  console.log('');
  console.log(chalk.bold('Đăng nhập vào ant-go'));
  console.log(chalk.gray('  Dùng --browser để đăng nhập với Google'));
  console.log('');

  const { email, password } = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
      validate: (v) => (v.includes('@') ? true : 'Email không hợp lệ'),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '•',
    },
  ]);

  const spinner = ora('Đang đăng nhập...').start();

  try {
    const { data } = await axios.post(`${API_URL}/api/auth/cli-login`, { email, password });

    setAuth({
      token:               data.cliToken,
      refreshToken:  data.refreshToken,
      expiresAt:     data.expiresAt,
      uid:           data.uid,
      email:         data.email,
      displayName:   data.displayName,
      photoURL:      data.photoURL,
      plan:          data.plan,
      builds:        data.builds,
      credits:       data.credits,
      planCredits:   data.planCredits,
    });

    spinner.succeed(`Đăng nhập thành công!`);
    printUserInfo(data);
  } catch (err) {
    spinner.fail('Đăng nhập thất bại');
    const msg = err.response?.data?.error ?? err.message;
    console.error(chalk.red(`  ✖  ${msg}`));
    console.log('');
    console.log(chalk.yellow("  Don't have an account yet?"));
    console.log(`  Register at: ${chalk.cyan('https://antgo.work/register')}`);
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
      reject(new Error('Timeout: quá 5 phút không hoàn tất đăng nhập'));
    }, 5 * 60 * 1000);

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const receivedState = url.searchParams.get('state');
      if (receivedState !== state) {
        res.writeHead(400);
        res.end('Invalid state');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f0c29;color:#fff">
          <h2 style="color:#a78bfa">✓ Đăng nhập thành công!</h2>
          <p style="color:#9ca3af">Bạn có thể đóng tab này và quay lại terminal.</p>
        </body></html>
      `);

      clearTimeout(timeout);
      server.close();

      setAuth({
        token:               url.searchParams.get('token'),
        refreshToken:        url.searchParams.get('refreshToken') || null,
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
      console.log(chalk.green('✓ Đăng nhập thành công!'));
      printUserInfo(session);

      resolve();
    });

    server.listen(port, () => {
      const loginUrl = `${API_URL}/auth/cli?port=${port}&state=${state}`;
      console.log('');
      console.log('Đang mở browser để đăng nhập với Google...');
      console.log(chalk.gray(`  Nếu browser không tự mở: ${loginUrl}`));
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
    console.log(chalk.yellow('Bạn chưa đăng nhập.'));
    console.log('');
    return;
  }

  try {
    await axios.delete(`${API_URL}/api/auth/cli-token`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
  } catch {
    // Bỏ qua — token có thể đã hết hạn
  }

  clearAuth();
  console.log('');
  console.log(chalk.green('✓ Đã đăng xuất thành công.'));
  console.log('');
}

// ── whoami ────────────────────────────────────────────────────────────────────

async function whoamiCommand() {
  const session = getAuth();
  if (!session?.token) {
    console.log('');
    console.log(chalk.yellow('Bạn chưa đăng nhập.'));
    console.log(chalk.gray('  Chạy: ant auth login'));
    console.log('');
    return;
  }

  const isExpired = session.expiresAt && new Date(session.expiresAt) < new Date();

  console.log('');
  console.log(chalk.bold('Thông tin tài khoản:'));
  console.log('');
  console.log(`  ${chalk.gray('Email:')}           ${session.email ?? '-'}`);
  if (session.displayName) {
    console.log(`  ${chalk.gray('Tên:')}             ${session.displayName}`);
  }
  console.log(`  ${chalk.gray('Plan:')}            ${chalk.cyan(session.plan ?? 'free')}`);
  console.log(`  ${chalk.gray('Builds còn lại:')}  ${session.freeBuildsRemaining ?? '-'}`);

  if (isExpired) {
    console.log(`  ${chalk.gray('Phiên:')}           ${chalk.red('Đã hết hạn — chạy: ant auth login')}`);
  } else if (session.expiresAt) {
    const exp = new Date(session.expiresAt).toLocaleString('vi-VN');
    console.log(`  ${chalk.gray('Hết hạn:')}         ${exp}`);
  }
  console.log('');
}

// ── ensureToken ───────────────────────────────────────────────────────────────
// Gọi trước khi chạy build: kiểm tra token, tự gia hạn nếu cần.

async function ensureToken() {
  if (isLoggedIn()) return getAuth().token;

  const session = getAuth();

  // Thử gia hạn bằng refreshToken
  if (session?.refreshToken) {
    const spinner = ora('Đang gia hạn phiên đăng nhập...').start();
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/cli-refresh`, {
        refreshToken: session.refreshToken,
      });

      setAuth({
        token:               data.cliToken,
        refreshToken:        data.refreshToken,
        expiresAt:           data.expiresAt,
        uid:                 data.uid,
        email:               data.email,
        displayName:         data.displayName,
        photoURL:            data.photoURL,
        plan:                data.plan,
        builds:              data.builds,
        freeBuildsRemaining: data.freeBuildsRemaining,
      });

      spinner.succeed('Phiên đăng nhập đã được gia hạn');
      return data.cliToken;
    } catch {
      spinner.fail('Không thể gia hạn phiên');
    }
  }

  console.log('');
  console.log(chalk.red('✖  Bạn chưa đăng nhập hoặc phiên đã hết hạn.'));
  console.log(chalk.gray('   Chạy: ant auth login'));
  console.log('');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function printUserInfo(data) {
  console.log('');
  console.log(`  ${chalk.gray('Email:')}           ${data.email ?? '-'}`);
  if (data.displayName) {
    console.log(`  ${chalk.gray('Tên:')}             ${data.displayName}`);
  }
  console.log(`  ${chalk.gray('Plan:')}            ${chalk.cyan(data.plan ?? 'free')}`);
  console.log(`  ${chalk.gray('Builds còn lại:')}  ${data.freeBuildsRemaining ?? '-'}`);
  console.log('');
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32'  ? `start "" "${url}"` :
                                    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(chalk.gray(`  Mở trình duyệt thủ công: ${url}`));
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
