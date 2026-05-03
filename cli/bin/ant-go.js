#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');

program
  .name('ant-go')
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
  });

auth
  .command('logout')
  .description('Đăng xuất khỏi tài khoản hiện tại')
  .action(async () => {
    const { logoutCommand } = require('../src/commands/auth');
    await logoutCommand();
  });

auth
  .command('whoami')
  .description('Xem thông tin tài khoản đang đăng nhập')
  .action(async () => {
    const { whoamiCommand } = require('../src/commands/auth');
    await whoamiCommand();
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
  });

// ── status ────────────────────────────────────────────────────────────────────
program
  .command('status <jobId>')
  .description('Xem trạng thái build job')
  .action(async (jobId) => {
    const { checkStatus } = require('../src/commands/status');
    await checkStatus(jobId);
  });

// ── configure-asc ─────────────────────────────────────────────────────────────
program
  .command('configure-asc')
  .description('Cấu hình App Store Connect API Key để submit TestFlight (lưu theo tài khoản)')
  .action(async () => {
    const { configureAsc } = require('../src/commands/configure-asc');
    await configureAsc({});
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
