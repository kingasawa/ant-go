/**
 * configure-asc.js — `ant-go configure-asc`
 *
 * Thu thập App Store Connect API Key từ Apple Developer Portal rồi lưu lên server.
 * Sau khi chạy lệnh này, dashboard sẽ không còn hỏi credentials khi submit TestFlight.
 *
 * Flow:
 *   1. Đăng nhập Apple Developer (Apple ID + password, hỗ trợ 2FA)
 *   2. Chọn: tạo key mới (tự động) hoặc dùng key đã có (nhập thủ công .p8)
 *   3. Gửi (keyId, issuerId, privateKeyP8) lên server → mã hoá + lưu Firestore
 */

const fs        = require('fs');
const path      = require('path');
const chalk     = require('chalk');
const ora       = require('ora');
const inquirer  = require('inquirer');
const axios     = require('axios');

const { API_URL, getAuth } = require('../config');
const { ensureToken }      = require('./auth');

// ─── Main ─────────────────────────────────────────────────────────────────────

async function configureAsc({ app: appName } = {}) {
  console.log('');
  console.log(chalk.bold('🔑  Cấu hình App Store Connect API Key'));
  console.log(chalk.gray('   Key này dùng để upload IPA lên TestFlight từ dashboard.'));
  console.log('');

  // 1. Đảm bảo đã đăng nhập ant-go
  const token = await ensureToken();

  // 2. Hỏi app name nếu chưa có
  if (!appName) {
    const { inputApp } = await inquirer.prompt([{
      type:     'input',
      name:     'inputApp',
      message:  'Tên app (appName trong ant.json):',
      validate: v => v.trim() ? true : 'Bắt buộc',
    }]);
    appName = inputApp.trim();
  }

  // 3. Kiểm tra key đã có trên server chưa
  let hasExisting = false;
  try {
    const { data } = await axios.get(`${API_URL}/api/apps/${appName}/app-store-key`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    hasExisting = data.hasKey;
    if (hasExisting) {
      console.log(chalk.yellow(`⚠  App "${appName}" đã có App Store Connect key (Key ID: ${data.keyId}).`));
      const { overwrite } = await inquirer.prompt([{
        type:    'list',
        name:    'overwrite',
        message: 'Bạn muốn:',
        choices: [
          { name: 'Cập nhật key mới',   value: true  },
          { name: 'Giữ nguyên và thoát', value: false },
        ],
      }]);
      if (!overwrite) {
        console.log(chalk.gray('  Đã hủy.'));
        console.log('');
        return;
      }
    }
  } catch (err) {
    if (err.response?.status !== 404) {
      // 404 nghĩa là app chưa có key — bình thường
      const msg = err.response?.data?.error ?? err.message;
      console.error(chalk.red(`  ✖  Không kiểm tra được key hiện tại: ${msg}`));
      // Vẫn tiếp tục để user có thể nhập key mới
    }
  }

  // 4. Chọn phương thức lấy key
  console.log('');
  const { method } = await inquirer.prompt([{
    type:    'list',
    name:    'method',
    message: 'Cách cung cấp App Store Connect API Key:',
    choices: [
      { name: '🤖  Tự động — Đăng nhập Apple Developer, tạo key mới (khuyến nghị)', value: 'auto' },
      { name: '✍️   Thủ công — Nhập Key ID, Issuer ID và file .p8',                   value: 'manual' },
    ],
  }]);

  let keyId, issuerId, privateKeyP8;

  if (method === 'auto') {
    ({ keyId, issuerId, privateKeyP8 } = await autoFetchKey());
  } else {
    ({ keyId, issuerId, privateKeyP8 } = await manualInputKey());
  }

  // 5. Gửi lên server
  const saveSpinner = ora(`Đang lưu key cho app "${appName}"...`).start();
  try {
    await axios.post(
      `${API_URL}/api/apps/${appName}/app-store-key`,
      { keyId, issuerId, privateKeyP8 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    saveSpinner.succeed(chalk.green(`App Store Connect key đã lưu cho app "${appName}"`));
  } catch (err) {
    saveSpinner.fail('Không lưu được key');
    const msg = err.response?.data?.error ?? err.message;
    console.error(chalk.red(`  ✖  ${msg}`));
    console.log('');
    process.exit(1);
  }

  console.log('');
  console.log(chalk.green('✓ Hoàn tất!'));
  console.log(chalk.gray('  Dashboard sẽ không còn hỏi App Store Connect key khi submit TestFlight.'));
  console.log('');
}

// ─── Auto: đăng nhập Apple Developer, tạo key mới ────────────────────────────

async function autoFetchKey() {
  const {
    Auth,
    Teams,
    ApiKey,
    ApiKeyType,
  } = require('@expo/apple-utils');

  console.log('');
  console.log(chalk.yellow.bold('🍎  Đăng nhập Apple Developer để tạo App Store Connect API Key'));
  console.log('');

  // 4a. Apple ID + password
  const { appleId, password } = await inquirer.prompt([
    {
      type:     'input',
      name:     'appleId',
      message:  'Apple ID (email):',
      validate: v => v.trim() ? true : 'Bắt buộc',
    },
    {
      type:     'password',
      name:     'password',
      message:  'App-Specific Password (appleid.apple.com):',
      mask:     '•',
      validate: v => v.trim() ? true : 'Bắt buộc',
    },
  ]);

  console.log('');
  const loginSpinner = ora('Đang đăng nhập Apple Developer...').start();

  let authCtx;
  try {
    const result = await Auth.loginAsync(
      { username: appleId.trim(), password: password.trim() },
      {
        serviceKey: undefined,
        onTwoFactorRequest: async () => {
          loginSpinner.stop();
          const { code } = await inquirer.prompt([{
            type:     'input',
            name:     'code',
            message:  '🔐 Nhập mã 2FA từ iPhone/Mac:',
            validate: v => /^\d{6}$/.test(v.trim()) ? true : 'Mã 6 chữ số',
          }]);
          loginSpinner.start('Đang xác thực 2FA...');
          return code.trim();
        },
      }
    );
    authCtx = result.context ?? result;
    loginSpinner.succeed('Đăng nhập Apple Developer thành công');
  } catch (err) {
    loginSpinner.fail('Đăng nhập thất bại: ' + err.message);
    throw err;
  }

  // 4b. Chọn team
  const teamSpinner = ora('Đang lấy danh sách team...').start();
  let teamId;
  try {
    const teams = await Teams.getTeamsAsync(authCtx);
    teamSpinner.stop();
    if (!teams?.length) throw new Error('Không tìm thấy Apple Developer team');

    if (teams.length === 1) {
      teamId = teams[0].teamId;
      console.log(chalk.green(`✔  Team: ${teams[0].name} (${teamId})`));
    } else {
      const { selectedTeam } = await inquirer.prompt([{
        type:    'list',
        name:    'selectedTeam',
        message: 'Chọn Apple Developer Team:',
        choices: teams.map(t => ({ name: `${t.name} (${t.teamId})`, value: t.teamId })),
      }]);
      teamId = selectedTeam;
    }
    await Teams.selectTeamAsync(authCtx, { teamId });
  } catch (err) {
    teamSpinner.fail ? teamSpinner.fail('Lỗi khi lấy team') : null;
    throw err;
  }

  // 4c. Thử lấy issuerId từ key đã có
  let issuerId = null;
  try {
    const existingKeys = await ApiKey.getAsync(authCtx) ?? [];
    if (existingKeys.length > 0) {
      const attrs = existingKeys[0]?.attributes ?? {};
      issuerId = attrs.provider?.id ?? attrs.issuerId ?? null;
      if (process.env.DEBUG) {
        console.log('Existing keys[0]:', JSON.stringify(existingKeys[0], null, 2));
      }
    }
  } catch (e) {
    if (process.env.DEBUG) console.log('Không lấy được existing keys:', e.message);
  }

  // 4d. Tạo key mới
  const createSpinner = ora('Đang tạo App Store Connect API Key...').start();
  let newKey;
  try {
    newKey = await ApiKey.createAsync(authCtx, {
      nickname:      'ant-go',
      roles:         ['ADMIN'],
      allAppsVisible: true,
      keyType:       ApiKeyType ? ApiKeyType.PUBLIC_API : 'PUBLIC_API',
    });
    createSpinner.succeed(`API Key đã tạo: ${newKey.id}`);
  } catch (err) {
    createSpinner.fail('Không tạo được API Key: ' + err.message);
    throw err;
  }

  const keyId = newKey.id;
  if (!keyId) throw new Error('Tạo key thành công nhưng không có Key ID trong response');

  // 4e. Download .p8
  const downloadSpinner = ora('Đang download private key (.p8)...').start();
  let privateKeyP8;
  try {
    privateKeyP8 = await newKey.downloadAsync();
    if (!privateKeyP8) throw new Error('Private key rỗng');
    downloadSpinner.succeed('Private key đã download');
  } catch (err) {
    downloadSpinner.fail('Không download được private key: ' + err.message);
    console.log('');
    console.log(chalk.red('  Key đã được tạo trên App Store Connect nhưng không download được .p8.'));
    console.log(chalk.yellow('  Vui lòng download thủ công tại:'));
    console.log(chalk.cyan('  https://appstoreconnect.apple.com/access/integrations/api'));
    console.log(chalk.gray(`  Key ID: ${keyId}`));
    console.log('');
    throw err;
  }

  // 4f. Issuer ID — prompt nếu không tự detect được
  if (!issuerId) {
    console.log('');
    console.log(chalk.yellow('⚠  Không tự phát hiện được Issuer ID.'));
    console.log(chalk.gray('   Tìm tại: App Store Connect → Users and Access → Integrations → App Store Connect API'));
    console.log(chalk.gray('   (UUID hiển thị phía trên danh sách key)'));
    console.log('');
    const { inputIssuerId } = await inquirer.prompt([{
      type:     'input',
      name:     'inputIssuerId',
      message:  'Issuer ID (UUID):',
      validate: v => v.trim() ? true : 'Bắt buộc',
    }]);
    issuerId = inputIssuerId.trim();
  } else {
    console.log(chalk.green(`✔  Issuer ID: ${issuerId}`));
  }

  return { keyId, issuerId, privateKeyP8 };
}

// ─── Manual: user nhập thủ công ───────────────────────────────────────────────

async function manualInputKey() {
  console.log('');
  console.log(chalk.gray('  Tạo key tại: App Store Connect → Users and Access → Integrations → App Store Connect API'));
  console.log('');

  const { keyId, issuerId } = await inquirer.prompt([
    {
      type:     'input',
      name:     'keyId',
      message:  'Key ID (VD: 2X9R4HXF34):',
      validate: v => v.trim() ? true : 'Bắt buộc',
    },
    {
      type:     'input',
      name:     'issuerId',
      message:  'Issuer ID (UUID):',
      validate: v => v.trim() ? true : 'Bắt buộc',
    },
  ]);

  // Hỏi path file .p8 hoặc paste trực tiếp
  const { inputMethod } = await inquirer.prompt([{
    type:    'list',
    name:    'inputMethod',
    message: 'Nội dung file .p8:',
    choices: [
      { name: 'Nhập đường dẫn đến file .p8', value: 'file' },
      { name: 'Paste nội dung trực tiếp',    value: 'paste' },
    ],
  }]);

  let privateKeyP8;
  if (inputMethod === 'file') {
    const { filePath } = await inquirer.prompt([{
      type:     'input',
      name:     'filePath',
      message:  'Đường dẫn file .p8:',
      validate: (v) => {
        const resolved = path.resolve(v.trim());
        if (!fs.existsSync(resolved)) return `Không tìm thấy file: ${resolved}`;
        return true;
      },
    }]);
    privateKeyP8 = fs.readFileSync(path.resolve(filePath.trim()), 'utf8');
  } else {
    const { pasted } = await inquirer.prompt([{
      type:     'editor',
      name:     'pasted',
      message:  'Paste nội dung file .p8 rồi lưu và đóng editor:',
    }]);
    privateKeyP8 = pasted;
  }

  if (!privateKeyP8?.includes('BEGIN') || !privateKeyP8?.includes('KEY')) {
    console.error(chalk.red('  ✖  Nội dung .p8 không hợp lệ (phải chứa BEGIN PRIVATE KEY)'));
    process.exit(1);
  }

  return { keyId: keyId.trim(), issuerId: issuerId.trim(), privateKeyP8: privateKeyP8.trim() };
}

module.exports = { configureAsc };

