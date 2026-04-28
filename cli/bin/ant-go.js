#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');

program
  .name('ant-go')
  .description('CLI to trigger iOS builds')
  .version(version);

// ── build ─────────────────────────────────────────────────────────────────────
program
  .command('build')
  .description('Trigger a build (ios hoặc android)')
  .option('--platform <platform>', 'Nền tảng build: ios hoặc android')
  .option('--profile <profile>', 'Build profile từ ant.json (default: production)', 'production')
  .option('--project <path>', 'Đường dẫn tới project (mặc định: thư mục hiện tại)')
  .option('--reauth', 'Bỏ qua cache, đăng nhập lại Apple Developer từ đầu')
  .option('--refresh-profile', 'Tạo lại Provisioning Profile (dùng khi thay đổi Capabilities)')
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

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
