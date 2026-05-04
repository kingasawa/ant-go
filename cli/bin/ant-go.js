#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');
const { startUpdateCheck } = require('../src/update-check');

// Kick off update check immediately (non-blocking)
const showUpdateHint = startUpdateCheck();

program
  .name('ant')
  .description('CLI to trigger iOS and Android builds')
  .version(version);

// ── auth ──────────────────────────────────────────────────────────────────────
const auth = program
  .command('auth')
  .description('Quản lý đăng nhập tài khoản ant-go');

auth
  .command('login')
  .description('Đăng nhập vào tài khoản ant-go')
  .option('--browser', 'Đăng nhập bằng Google qua trình duyệt')
  .action(async (options) => {
    const { loginCommand } = require('../src/commands/auth');
    await loginCommand({ browser: !!options.browser });
    await showUpdateHint();
  });

auth
  .command('logout')
  .description('Đăng xuất khỏi tài khoản hiện tại')
  .action(async () => {
    const { logoutCommand } = require('../src/commands/auth');
    await logoutCommand();
    await showUpdateHint();
  });

auth
  .command('whoami')
  .description('Xem thông tin tài khoản đang đăng nhập')
  .action(async () => {
    const { whoamiCommand } = require('../src/commands/auth');
    await whoamiCommand();
    await showUpdateHint();
  });

// ── build ─────────────────────────────────────────────────────────────────────
program
  .command('build')
  .description('Trigger a build (ios hoặc android)')
  .option('--platform <platform>', 'Nền tảng build: ios hoặc android')
  .option('--profile <profile>', 'Build profile từ ant.json (default: production)', 'production')
  .option('--project <path>', 'Đường dẫn tới project (mặc định: thư mục hiện tại)')
  .option('--reauth', 'Bỏ qua cache, đăng nhập lại Apple Developer từ đầu')
  .option('--refresh-profile', 'Tạo lại Provisioning Profile (dùng khi thay đổi Capabilities)')
  .option('--auto-submit', 'Tự động submit IPA lên TestFlight sau khi build thành công')
  .action(async (options) => {
    const { runBuild } = require('../src/commands/build');
    await runBuild(options);
    await showUpdateHint();
  });

// ── status ────────────────────────────────────────────────────────────────────
program
  .command('status <jobId>')
  .description('Xem trạng thái build job')
  .action(async (jobId) => {
    const { checkStatus } = require('../src/commands/status');
    await checkStatus(jobId);
    await showUpdateHint();
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
