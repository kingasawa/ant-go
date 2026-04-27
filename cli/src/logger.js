/**
 * logger.js — Simple timestamped logger with chalk colors
 */

const chalk = require('chalk');

function log(msg)     { console.log(`${chalk.gray('[' + new Date().toLocaleTimeString() + ']')} ${msg}`); }
function info(msg)    { console.log(`${chalk.cyan('ℹ')} ${msg}`); }
function success(msg) { console.log(`${chalk.green('✓')} ${msg}`); }
function warn(msg)    { console.warn(`${chalk.yellow('⚠')} ${msg}`); }
function error(msg)   { console.error(`${chalk.red('✗')} ${msg}`); }

module.exports = { log, info, success, warn, error };

