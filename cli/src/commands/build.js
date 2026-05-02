/**
 * build.js — `ant-go build`
 *
 * Flow:
 *  1. Đọc app.json → lấy projectId + project info (bundleId, scheme, xcworkspace, xcodeproj)
 *  2. Lấy Apple credentials (cache hoặc interactive login)
 *  3. POST /builds { projectId } → server trả { jobId, tarUploadUrl, credsUploadUrl }
 *  4. Pack project → upload ios.tar.gz
 *  5. Tạo credentials.json → upload
 *  6. POST /builds/:id/start
 *  7. Poll status
 */

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const https = require('https');
const http  = require('http');
const { spawn } = require('child_process');
const chalk  = require('chalk');
const ora    = require('ora');

const CLI_VERSION = '1.0';

const { API_URL, loadConfig }          = require('../config');
const { ensureToken }                  = require('./auth');
const { createClient, createBuild, getBuildStatus, fetchUserInfo } = require('../api');
const { ensureAppleCreds }             = require('../apple-creds');
const logger = require('../logger');

const STEP_LABELS = {
  uploading:      '☁️  CLI đang upload project...',
  pending:        '⏳ Đang chờ build server xử lý...',
  initialising:   '🔧 Đang khởi tạo...',
  setup_certs:    '🔑 Đang setup certificates...',
  bundle_install: '💎 Đang cài Ruby gems...',
  fastlane_build: '🏗️  Đang build IPA (Fastlane)...',
};

// ── ant.json — build profiles ─────────────────────────────────────────────────
const DEFAULT_ANT_JSON = {
  build: {
    production: {
      distribution: 'store',
    },
    development: {
      developmentClient: true,
      distribution: 'internal',
    },
    preview: {
      distribution: 'internal',
    },
  },
};

function resolveAntJson(projectRoot, profileName) {
  const antJsonPath = path.join(projectRoot, 'ant.json');

  if (!fs.existsSync(antJsonPath)) {
    fs.writeFileSync(antJsonPath, JSON.stringify(DEFAULT_ANT_JSON, null, 2));
    console.log('');
    console.log(chalk.cyan('📄  Đã tạo ant.json với các profile mặc định:'));
    Object.entries(DEFAULT_ANT_JSON.build).forEach(([name, cfg]) => {
      const tags = [`distribution: ${cfg.distribution}`];
      if (cfg.developmentClient) tags.push('developmentClient: true');
      console.log(`     ${chalk.cyan(name.padEnd(12))}  ${tags.join(', ')}`);
    });
    console.log('');
  }

  let antJson;
  try { antJson = JSON.parse(fs.readFileSync(antJsonPath, 'utf8')); }
  catch { logger.error('Không thể parse ant.json'); process.exit(1); }

  const profiles = antJson.build || {};
  const profile  = profiles[profileName];

  if (!profile) {
    console.log('');
    console.log(chalk.red(`✖  Profile "${profileName}" không tồn tại trong ant.json`));
    console.log('');
    const names = Object.keys(profiles);
    if (names.length > 0) {
      console.log('   Profiles hiện có:');
      names.forEach(n => {
        const cfg  = profiles[n];
        const tags = [`distribution: ${cfg.distribution || 'store'}`];
        if (cfg.developmentClient) tags.push('developmentClient: true');
        console.log(`     ${chalk.cyan(('--profile ' + n).padEnd(24))}  ${tags.join(', ')}`);
      });
      console.log('');
    }
    process.exit(1);
  }

  // buildNumber: nếu có trong ant.json thì dùng, không thì để null (server sẽ auto-increment)
  const rawBN = profile.buildNumber;
  const buildNumber =
    typeof rawBN === 'number' && Number.isInteger(rawBN) && rawBN > 0 ? rawBN : null;

  return {
    distribution:      profile.distribution      || 'store',
    developmentClient: !!profile.developmentClient,
    buildNumber,
  };
}

// ── Đọc và kiểm tra app.json ──────────────────────────────────────────────────
function resolveProjectInfo(projectRoot) {
  const appJsonPath = path.join(projectRoot, 'app.json');
  if (!fs.existsSync(appJsonPath)) {
    logger.error(`Không tìm thấy app.json tại: ${appJsonPath}`);
    process.exit(1);
  }

  let appJson;
  try { appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')); }
  catch { logger.error('Không thể parse app.json'); process.exit(1); }

  appJson.expo             ??= {};
  appJson.expo.extra       ??= {};
  appJson.expo.extra.ant   ??= {};

  const ant = appJson.expo.extra.ant;
  const projectId = ant.projectId;

  if (!projectId?.trim()) {
    if (projectId === undefined) {
      ant.projectId = '';
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    }
    console.log('');
    console.log(chalk.yellow('⚠  Chưa có projectId trong app.json → expo.extra.ant.projectId'));
    console.log(`   Vào ${chalk.cyan('https://antgo.work')} để lấy Project ID\n`);
    process.exit(0);
  }

  // Đọc project info từ app.json hoặc ios/ folder
  const iosDir     = path.join(projectRoot, 'ios');
  const xcworkspace = ant.xcworkspace ?? findFile(iosDir, '.xcworkspace');
  const xcodeproj   = ant.xcodeproj   ?? findFile(iosDir, '.xcodeproj');
  const schemeName  = ant.schemeName  ?? xcworkspace?.replace('.xcworkspace', '') ?? '';
  const bundleId    = ant.bundleId    ?? appJson.expo?.ios?.bundleIdentifier ?? '';

  if (!bundleId) {
    logger.error('Thiếu bundleId — thêm expo.extra.ant.bundleId hoặc expo.ios.bundleIdentifier vào app.json');
    process.exit(1);
  }

  return { projectId: projectId.trim(), bundleId, schemeName, xcworkspace, xcodeproj };
}

function findFile(dir, ext) {
  if (!fs.existsSync(dir)) return '';
  const found = fs.readdirSync(dir).find(f => f.endsWith(ext));
  return found ?? '';
}

// ── Header box ────────────────────────────────────────────────────────────────
function printHeader(lines) {
  const width = Math.max(36, ...lines.map(l => l.length + 6));
  const sep   = '='.repeat(width);
  const row   = text => {
    const pad = width - 6 - text.length;
    return `== ${text}${' '.repeat(Math.max(0, pad))} ==`;
  };
  console.log('');
  console.log(chalk.bold.cyan(sep));
  lines.forEach(l => console.log(chalk.bold.cyan(row(l))));
  console.log(chalk.bold.cyan(sep));
  console.log('');
}

// ── Pack project (async để spinner có thể quay) ───────────────────────────────
function packProject(projectRoot, tarFile, platform) {
  const isAndroid = platform === 'android';
  const excludes = isAndroid ? [
    '--exclude=node_modules/.cache',
    '--exclude=android/build',
    '--exclude=android/.gradle',
    '--exclude=.git',
    '--exclude=.expo',
  ] : [
    '--exclude=node_modules/.cache',
    '--exclude=ios/Pods',
    '--exclude=ios/build',
    '--exclude=ios/fastlane',
    '--exclude=.git',
    '--exclude=.expo',
  ];
  const dirs = isAndroid
    ? 'android node_modules package.json package-lock.json'
    : 'ios node_modules package.json package-lock.json';
  const cmd = `tar -czf "${tarFile}" ${excludes.join(' ')} -C "${projectRoot}" ${dirs}`;
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', cmd], { stdio: 'pipe' });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`tar exit ${code}: ${stderr.slice(-300)}`));
    });
    child.on('error', reject);
  });
}

// ── Upload via signed URL ─────────────────────────────────────────────────────
// Dùng native https để stream pipe thẳng vào socket.
// Backpressure từ network làm data event chậm lại đúng tốc độ upload thực tế.
function uploadFile(uploadUrl, filePath, contentType, spinner) {
  return new Promise((resolve, reject) => {
    const fileSize  = fs.statSync(filePath).size;
    const totalMB   = (fileSize / 1024 / 1024).toFixed(1);
    let uploaded    = 0;

    const url = new URL(uploadUrl);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method:   'PUT',
      headers:  { 'Content-Type': contentType, 'Content-Length': fileSize },
    }, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) resolve();
      else reject(new Error(`Upload failed: HTTP ${res.statusCode}`));
    });

    req.on('error', reject);

    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => {
      uploaded += chunk.length;
      const pct        = Math.round((uploaded / fileSize) * 100);
      const uploadedMB = (uploaded / 1024 / 1024).toFixed(1);
      spinner.text = `Đang upload... ${pct}% (${uploadedMB} / ${totalMB} MB)`;
    });
    stream.on('error', reject);
    stream.pipe(req);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function runBuild(options) {
  // Kiểm tra đăng nhập — tự gia hạn token nếu cần
  const authToken = await ensureToken();

  const platform = (options.platform || '').toLowerCase();
  if (!platform) {
    console.log('');
    console.log(chalk.red('✖  Thiếu flag --platform'));
    console.log('');
    console.log(`   Cách dùng: ${chalk.cyan('ant-go build --platform <platform>')}`);
    console.log('');
    console.log('   Nền tảng hỗ trợ:');
    console.log(`     ${chalk.cyan('--platform ios')}      Build iOS app (.ipa)`);
    console.log(`     ${chalk.cyan('--platform android')}  Build Android app`);
    console.log('');
    console.log('   Ví dụ:');
    console.log(`     ${chalk.gray('$')} ant-go build --platform ios`);
    console.log('');
    process.exit(1);
  }
  if (!['ios', 'android'].includes(platform)) {
    console.log('');
    console.log(chalk.red(`✖  --platform không hợp lệ: "${options.platform}"`));
    console.log('');
    console.log(`   Chỉ chấp nhận: ${chalk.cyan('ios')} hoặc ${chalk.cyan('android')}`);
    console.log('');
    process.exit(1);
  }
  const cfg    = loadConfig();
  const client = createClient(API_URL, authToken);

  // Fetch fresh user info (plan, quota, devices)
  const infoSpinner = ora('Đang tải thông tin tài khoản...').start();
  let userInfo;
  try {
    userInfo = await fetchUserInfo(client);
    infoSpinner.succeed(
      `Plan: ${chalk.cyan(userInfo.plan)}  ·  ` +
      `Builds còn lại: ${chalk.bold(userInfo.freeBuildsRemaining)}`
    );
  } catch (err) {
    infoSpinner.fail('Không tải được thông tin tài khoản');
    logger.error(err.response?.data?.error ?? err.message);
    process.exit(1);
  }

  // Kiểm tra quota
  if (userInfo.plan === 'free' && userInfo.freeBuildsRemaining <= 0) {
    console.log('');
    console.log(chalk.red('✖  Bạn đã hết lượt build miễn phí.'));
    console.log(chalk.gray('   Nâng cấp tại: https://antgo.work/account/billing'));
    console.log('');
    process.exit(1);
  }
  if (userInfo.planStatus === 'past_due') {
    console.log(chalk.yellow('⚠  Thanh toán thất bại — vui lòng cập nhật thông tin thanh toán.'));
    console.log(chalk.gray('   https://antgo.work/account/billing'));
    console.log('');
  }

  const projectRoot = options.project
    ? path.resolve(options.project)
    : cfg.projectRoot ? path.resolve(cfg.projectRoot) : process.cwd();

  const platformDir = platform === 'android' ? 'android' : 'ios';
  if (!fs.existsSync(path.join(projectRoot, platformDir))) {
    logger.error(`Không tìm thấy thư mục ${platformDir}/ trong: ${projectRoot}`);
    process.exit(1);
  }

  // 1. Đọc ant.json + app.json
  const profileName   = options.profile || 'production';
  const profileConfig = resolveAntJson(projectRoot, profileName);
  const { distribution, developmentClient, buildNumber: configBuildNumber } = profileConfig;

  const autoSubmit = !!options.autoSubmit;

  if (autoSubmit && distribution !== 'store') {
    console.log('');
    console.log(chalk.red('✖  --auto-submit chỉ dùng được với distribution: store'));
    console.log(chalk.gray(`   Profile "${profileName}" đang dùng distribution: ${distribution}`));
    console.log('');
    process.exit(1);
  }

  const projectInfo = resolveProjectInfo(projectRoot);
  printHeader([
    `Ant Go CLI : v${CLI_VERSION}`,
    `Project ID : ${projectInfo.projectId}`,
    `Bundle ID  : ${projectInfo.bundleId}`,
    `Profile    : ${profileName}  (${distribution}${developmentClient ? ', devClient' : ''})`,
    `Build #    : ${configBuildNumber != null ? configBuildNumber : 'auto'}`,
    ...(autoSubmit ? ['Auto Submit: TestFlight'] : []),
  ]);

  // 2. Apple credentials (iOS only)
  let creds;
  if (platform === 'ios') {
    try {
      creds = await ensureAppleCreds(projectInfo, {
        force:          !!options.reauth,
        refreshProfile: !!options.refreshProfile,
        distribution,
        profileName,
        userDevices: userInfo.devices,
        apiClient:   client,
      });
    } catch (err) {
      logger.error('Không lấy được Apple credentials: ' + err.message);
      process.exit(1);
    }
  }

  // 3. Tạo build job → lấy 2 signed URLs (cùng folder trên Storage)
  const spinner = ora('Đang tạo build job...').start();
  let jobId, tarUrl, credsUrl;
  try {
    const res = await createBuild(client, {
      projectId: projectInfo.projectId,
      platform,
      autoSubmit,
      ...(configBuildNumber != null && { buildNumber: configBuildNumber }),
    });
    jobId    = res.jobId;
    tarUrl   = res.tarUrl;
    credsUrl = res.credsUrl;
    const resolvedBN = res.buildNumber;
    spinner.succeed(`Job tạo thành công: ${chalk.bold(jobId)}  ·  Build #${chalk.cyan(resolvedBN)}`);
  } catch (err) {
    spinner.fail('Tạo build job thất bại');
    const msg = err.response?.data?.error ?? err.message;
    logger.error(msg);
    process.exit(1);
  }

  const tmpDir = path.join(os.tmpdir(), `ant-go-${jobId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // 4. Pack + upload tar.gz
  const tarName = platform === 'android' ? 'android.tar.gz' : 'ios.tar.gz';
  const tarFile = path.join(tmpDir, tarName);
  const packSpinner = ora('Đang nén project...').start();
  try {
    await packProject(projectRoot, tarFile, platform);
    const sizeMB = (fs.statSync(tarFile).size / 1024 / 1024).toFixed(1);
    packSpinner.succeed(`Project đã nén: ${sizeMB} MB`);
  } catch (err) {
    packSpinner.fail('Lỗi khi nén project');
    logger.error(err.message);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.exit(1);
  }

  const tarSpinner = ora(`Đang upload ${tarName}...`).start();
  try {
    await uploadFile(tarUrl, tarFile, 'application/gzip', tarSpinner);
    tarSpinner.succeed(`Upload ${tarName} hoàn tất`);
  } catch (err) {
    tarSpinner.fail(`Lỗi khi upload ${tarName}`);
    logger.error(err.message);
    process.exit(1);
  }

  // 5. Tạo + upload credentials.json (iOS only)
  if (platform === 'ios') {
    const credsFile = path.join(tmpDir, 'credentials.json');
    fs.writeFileSync(credsFile, JSON.stringify({
      p12Base64:             creds.p12Base64,
      p12Password:           creds.p12Password,
      mobileprovisionBase64: creds.mobileprovisionBase64,
      bundleId:              creds.bundleId,
      teamId:                creds.teamId,
      schemeName:            creds.schemeName,
      xcworkspace:           creds.xcworkspace,
      xcodeproj:             creds.xcodeproj,
      distribution,
      developmentClient,
    }));

    const credsSpinner = ora('Đang upload credentials.json...').start();
    try {
      await uploadFile(credsUrl, credsFile, 'application/json', credsSpinner);
      credsSpinner.succeed('Upload credentials.json hoàn tất');
    } catch (err) {
      credsSpinner.fail('Lỗi khi upload credentials.json');
      logger.error(err.message);
      process.exit(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } else {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 6. Notify server — verify 2 file đã tồn tại và đánh dấu pending
  const startSpinner = ora('Đang kiểm tra files...').start();
  try {
    await client.post(`/api/builds/${jobId}/start`);
    startSpinner.succeed('Đã kiểm tra đầy đủ files');
  } catch (err) {
    startSpinner.fail('Không thể khởi động build');
    logger.error(err.response?.data?.error ?? err.message);
    process.exit(1);
  }

  // Hiện URL và thoát — user vào web xem log, CLI không poll gì thêm
  const appUrl  = `${API_URL}/account/app/${encodeURIComponent(projectInfo.schemeName)}/builds/${jobId}`;
  const hyperlink = (url, text) => `]8;;${url}\\${text}]8;;\\`;
  console.log('');
  console.log(chalk.bold('Build đã được gửi lên server!'));
  if (autoSubmit) {
    console.log(chalk.gray('   ✈  Auto Submit: bật — IPA sẽ tự động được gửi lên TestFlight sau khi build xong.'));
  }
  console.log('');
  console.log(`   Theo dõi tiến trình tại:`);
  console.log(`   ${chalk.cyan.underline(hyperlink(appUrl, appUrl))}`);
  console.log('');
  process.exit(0);
}

module.exports = { runBuild };

