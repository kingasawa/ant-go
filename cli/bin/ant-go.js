#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');
const { startUpdateCheck } = require('../src/update-check');
const { setLang, isFirstRun, markFirstRunDone } = require('../src/config');
const { t, getLang } = require('../src/i18n');
const chalk = require('chalk');

// ── First-run welcome ─────────────────────────────────────────────────────────
if (isFirstRun()) {
  markFirstRunDone();
  console.log('');
  console.log(chalk.bold.cyan(`  🐜  ant-go CLI  v${version}`));
  console.log(chalk.gray('  ─────────────────────────────────'));
  console.log(`  ${t('firstRunWelcome')}`);
  console.log('');
  console.log(`  ${t('firstRunGetStarted')}`);
  console.log(`  ${chalk.cyan('ant auth login')}`);
  console.log('');
  console.log(`  ${t('firstRunDocs')} ${chalk.cyan('https://antgo.work/docs')}`);
  console.log('');
  console.log(chalk.yellow(`  ${t('firstRunLangHint')}`));
  console.log('');
}

// Kick off update check immediately (non-blocking)
const showUpdateHint = startUpdateCheck();

program
  .name('ant')
  .description('CLI to trigger iOS and Android builds')
  .version(version);

// ── auth ──────────────────────────────────────────────────────────────────────
const auth = program
  .command('auth')
  .description('Manage account authentication');

auth
  .command('login')
  .description('Login to your ant-go account')
  .option('--browser', 'Login with Google via browser')
  .action(async (options) => {
    const { loginCommand } = require('../src/commands/auth');
    await loginCommand({ browser: !!options.browser });
    await showUpdateHint();
    process.exit(0);
  });

auth
  .command('logout')
  .description('Logout from current account')
  .action(async () => {
    const { logoutCommand } = require('../src/commands/auth');
    await logoutCommand();
    await showUpdateHint();
  });

auth
  .command('whoami')
  .description('Show current logged-in account info')
  .action(async () => {
    const { whoamiCommand } = require('../src/commands/auth');
    await whoamiCommand();
    await showUpdateHint();
  });

// ── build ─────────────────────────────────────────────────────────────────────
program
  .command('build')
  .description('Trigger a build (ios or android)')
  .option('--platform <platform>', 'Build platform: ios or android')
  .option('--profile <profile>', 'Build profile from ant.json (default: production)', 'production')
  .option('--project <path>', 'Path to project directory (default: current directory)')
  .option('--reauth', 'Clear Apple Developer session cache and re-login')
  .option('--refresh-profile', 'Recreate Provisioning Profile')
  .option('--auto-submit', 'Auto submit IPA to TestFlight after successful build')
  .option('--no-prebuild', 'Skip expo prebuild step (use existing native project as-is)')
  .action(async (options) => {
    const { runBuild } = require('../src/commands/build');
    await runBuild(options);
    await showUpdateHint();
  });

// ── status ────────────────────────────────────────────────────────────────────
program
  .command('status <jobId>')
  .description('Check build job status')
  .action(async (jobId) => {
    const { checkStatus } = require('../src/commands/status');
    await checkStatus(jobId);
    await showUpdateHint();
  });

// ── set ───────────────────────────────────────────────────────────────────────
const set = program
  .command('set')
  .description('Set CLI preferences');

set
  .command('lang <lang>')
  .description('Set language: vi (Vietnamese) or en (English)')
  .action((lang) => {
    const valid = ['vi', 'en'];
    if (!valid.includes(lang)) {
      console.log('');
      console.log(chalk.red(`  ${t('langInvalid')}`));
      console.log('');
      process.exit(1);
    }
    setLang(lang);
    console.log('');
    console.log(chalk.green(`  ${t('langSet', lang)}`));
    console.log(chalk.gray(`  ${t('firstRunLangHint')}`));
    console.log('');
  });

// ── uninstall ─────────────────────────────────────────────────────────────────
program
  .command('uninstall')
  .description('Uninstall ant-go CLI from this machine')
  .action(async () => {
    const inquirer = require('inquirer');
    const { execSync } = require('child_process');
    const ora = require('ora');

    console.log('');
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: t('uninstallConfirm'),
      default: false,
    }]);

    if (!confirm) {
      console.log(chalk.gray(`  ${t('uninstallCancelled')}`));
      console.log('');
      process.exit(0);
    }

    const spinner = ora(t('uninstallRunning')).start();
    try {
      execSync('npm uninstall -g ant-go', { stdio: 'ignore' });
      spinner.succeed(chalk.green(t('uninstallDone')));
      console.log('');
    } catch (err) {
      spinner.fail(chalk.red(t('uninstallFailed', err.message)));
      console.log('');
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
