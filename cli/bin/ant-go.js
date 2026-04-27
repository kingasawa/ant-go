#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');

program
  .name('ant-go')
  .description('CLI to trigger iOS builds')
  .version(version);

// ── configure ─────────────────────────────────────────────────────────────────
program
  .command('configure')
  .description('Thiết lập đường dẫn iOS project (optional)')
  .option('--project <path>', 'Đường dẫn tới iOS project (mặc định: thư mục hiện tại)')
  .action(async (options) => {
    const { configure } = require('../src/commands/configure');
    await configure(options);
  });

// ── build ─────────────────────────────────────────────────────────────────────
program
  .command('build')
  .description('Trigger a build (ios hoặc android)')
  .option('--platform <platform>', 'Nền tảng build: ios hoặc android')
  .option('--profile <profile>', 'Build profile từ ant.json (default: production)', 'production')
  .option('--project <path>', 'Đường dẫn tới project (override configure)')
  .option('--reauth', 'Bỏ qua cache, đăng nhập lại Apple Developer từ đầu')
  .option('--refresh-profile', 'Tạo lại Provisioning Profile (dùng khi thay đổi Capabilities)')
  .option('--no-watch', 'Không theo dõi tiến trình sau khi submit')
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
