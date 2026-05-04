/**
 * configure.js — `ant configure`
 * User chỉ cần set projectRoot (optional, mặc định là cwd khi chạy build)
 * Server URL được hardcode — user không cần biết.
 */

const { saveConfig, loadConfig, CONFIG_FILE, API_URL } = require('../config');
const logger = require('../logger');
const chalk  = require('chalk');

async function configure(options) {
  const updates = {};
  if (options.project) updates.projectRoot = require('path').resolve(options.project);

  if (!Object.keys(updates).length) {
    const cfg = loadConfig();
    console.log('');
    console.log(`  Config:  ${chalk.gray(CONFIG_FILE)}`);
    console.log(`  Server:  ${chalk.green(API_URL)} ${chalk.gray('(hardcoded)')}`);
    console.log(`  Project: ${cfg.projectRoot ? chalk.green(cfg.projectRoot) : chalk.gray('(cwd khi chạy ant build)')}`);
    console.log('');
    console.log(`  Dùng: ${chalk.cyan('ant configure --project <path>')}\n`);
    return;
  }

  saveConfig(updates);
  if (updates.projectRoot) logger.success(`Project: ${chalk.green(updates.projectRoot)}`);
}

module.exports = { configure };
