/**
 * status.js — `ant-go status <jobId>`
 */

const { API_URL }                      = require('../config');
const { createClient, getBuildStatus } = require('../api');
const { watchBuild }               = require('./build');
const logger = require('../logger');
const chalk  = require('chalk');

async function checkStatus(jobId, options) {
  const client = createClient(API_URL);

  let data;
  try {
    data = await getBuildStatus(client, jobId);
  } catch (err) {
    logger.error(err.response?.data?.message ?? err.message);
    process.exit(1);
  }

  console.log('');
  console.log(`  Job ID:   ${chalk.bold(jobId)}`);
  console.log(`  Status:   ${colorStatus(data.status)}`);
  if (data.step)      console.log(`  Step:     ${data.step}`);
  if (data.createdAt) console.log(`  Created:  ${new Date(data.createdAt).toLocaleString()}`);
  if (data.updatedAt) console.log(`  Updated:  ${new Date(data.updatedAt).toLocaleString()}`);
  if (data.error)     console.log(`  Error:    ${chalk.red(data.error)}`);
  if (data.ipaUrl)    console.log(`  IPA:      ${chalk.underline(data.ipaUrl)}`);
  if (data.dsymUrl)   console.log(`  dSYM:     ${chalk.underline(data.dsymUrl)}`);
  console.log('');

  if (data.status === 'pending' || data.status === 'running') {
    logger.log('Build đang chạy — đang theo dõi...\n');
    try { await watchBuild(client, jobId); } catch { process.exit(1); }
  }
  process.exit(0);
}

function colorStatus(s) {
  const u = (s ?? '').toUpperCase();
  if (s === 'success') return chalk.green.bold(u);
  if (s === 'failed')  return chalk.red.bold(u);
  if (s === 'running') return chalk.cyan(u);
  if (s === 'pending') return chalk.yellow(u);
  return u || '(UNKNOWN)';
}

module.exports = { checkStatus };
