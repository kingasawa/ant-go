/**
 * build.js — `ant build`
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
const { createClient, createBuild, getBuildStatus, fetchUserInfo, uploadAscKey } = require('../api');
const { ensureAppleCreds }             = require('../apple-creds');
const logger = require('../logger');
const { t, tError } = require('../i18n');

const STEP_LABELS = {
  uploading:      { vi: '☁️  CLI đang upload project...', en: '☁️  CLI is uploading project...' },
  pending:        { vi: '⏳ Đang chờ build server xử lý...', en: '⏳ Waiting for build server...' },
  initialising:   { vi: '🔧 Đang khởi tạo...', en: '🔧 Initialising...' },
  setup_certs:    { vi: '🔑 Đang setup certificates...', en: '🔑 Setting up certificates...' },
  bundle_install: { vi: '💎 Đang cài Ruby gems...', en: '💎 Installing Ruby gems...' },
  fastlane_build: { vi: '🏗️  Đang build IPA (Fastlane)...', en: '🏗️  Building IPA (Fastlane)...' },
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
    console.log(chalk.cyan(t('antJsonCreated')));
    Object.entries(DEFAULT_ANT_JSON.build).forEach(([name, cfg]) => {
      const tags = [`distribution: ${cfg.distribution}`];
      if (cfg.developmentClient) tags.push('developmentClient: true');
      console.log(`     ${chalk.cyan(name.padEnd(12))}  ${tags.join(', ')}`);
    });
    console.log('');
  }

  let antJson;
  try { antJson = JSON.parse(fs.readFileSync(antJsonPath, 'utf8')); }
  catch { logger.error(t('antJsonParseFailed')); process.exit(1); }

  const profiles = antJson.build || {};
  const profile  = profiles[profileName];

  if (!profile) {
    console.log('');
    console.log(chalk.red(`✖  ${t('antJsonProfileNotFound', profileName)}`));
    console.log('');
    const names = Object.keys(profiles);
    if (names.length > 0) {
      console.log(t('antJsonProfilesAvailable'));
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

  return {
    distribution:      profile.distribution      || 'store',
    developmentClient: !!profile.developmentClient,
  };
}

// ── Đọc và kiểm tra app.json ──────────────────────────────────────────────────
function resolveProjectInfo(projectRoot) {
  const appJsonPath = path.join(projectRoot, 'app.json');
  if (!fs.existsSync(appJsonPath)) {
    logger.error(t('appJsonNotFound', appJsonPath));
    process.exit(1);
  }

  let appJson;
  try { appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')); }
  catch { logger.error(t('appJsonParseFailed')); process.exit(1); }

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
    console.log(chalk.yellow(t('appJsonNoProjectId')));
    console.log(`   ${t('appJsonNoProjectIdHint')}\n`);
    process.exit(0);
  }

  // Đọc project info từ app.json hoặc ios/ folder
  const iosDir     = path.join(projectRoot, 'ios');
  const xcworkspace = ant.xcworkspace ?? findFile(iosDir, '.xcworkspace');
  const xcodeproj   = ant.xcodeproj   ?? findFile(iosDir, '.xcodeproj');
  const schemeName  = ant.schemeName  ?? xcworkspace?.replace('.xcworkspace', '') ?? '';
  const bundleId    = ant.bundleId    ?? appJson.expo?.ios?.bundleIdentifier ?? '';

  if (!bundleId) {
    logger.error(t('appJsonNoBundleId'));
    process.exit(1);
  }

  // buildNumber: đọc từ expo.ios.buildNumber (đồng bộ EAS), nếu không có → null (server auto-increment)
  const rawBN = appJson.expo?.ios?.buildNumber;
  const buildNumber = rawBN != null && /^\d+$/.test(String(rawBN)) ? parseInt(String(rawBN), 10) : null;

  return { projectId: projectId.trim(), bundleId, schemeName, xcworkspace, xcodeproj, buildNumber };
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

  // Convert Windows path (C:\foo) → POSIX path (/c/foo) cho bash trên Windows (Git Bash / MINGW)
  const toPosix = p => p.replace(/^([A-Za-z]):[\\/]/, (_, d) => `/${d.toLowerCase()}/`).replace(/\\/g, '/');
  const tarFilePosix  = toPosix(tarFile);
  const projectPosix  = toPosix(projectRoot);

  const cmd = `tar -czf "${tarFilePosix}" ${excludes.join(' ')} -C "${projectPosix}" ${dirs}`;
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
      spinner.text = t('buildUploadProgress', pct, uploadedMB, totalMB);
    });
    stream.on('error', reject);
    stream.pipe(req);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function runBuild(options) {
  const authToken = await ensureToken();

  const platform = (options.platform || '').toLowerCase();
  if (!platform) {
    console.log('');
    console.log(chalk.red(`✖  ${t('buildNoPlatform')}`));
    console.log('');
    console.log(`   ${t('buildUsage')} ${chalk.cyan('ant build --platform <platform>')}`);
    console.log('');
    console.log(`   ${t('buildPlatformSupported')}`);
    console.log(`     ${chalk.cyan('--platform ios')}      Build iOS app (.ipa)`);
    console.log(`     ${chalk.cyan('--platform android')}  Build Android app`);
    console.log('');
    console.log(`   ${t('buildExample')}`);
    console.log('');
    process.exit(1);
  }
  if (!['ios', 'android'].includes(platform)) {
    console.log('');
    console.log(chalk.red(`✖  ${t('buildPlatformInvalid', options.platform)}`));
    console.log('');
    console.log(`   ${t('buildPlatformOnly')}`);
    console.log('');
    process.exit(1);
  }
  const cfg    = loadConfig();
  const client = createClient(API_URL, authToken);

  // Fetch fresh user info (plan, quota, devices)
  const infoSpinner = ora(t('buildLoadingAccount')).start();
  let userInfo;
  try {
    userInfo = await fetchUserInfo(client);
    const creditsDisplay = userInfo.planCredits === -1
      ? 'Unlimited'
      : `${userInfo.credits.toFixed ? userInfo.credits.toFixed(1) : userInfo.credits}/${userInfo.planCredits}`;
    infoSpinner.succeed(t('buildCreditsRemaining', chalk.cyan(userInfo.plan), chalk.bold(creditsDisplay)));
  } catch (err) {
    infoSpinner.fail(t('buildLoadAccountFailed'));
    logger.error(tError(err.response?.data?.error ?? err.message));
    process.exit(1);
  }

  if (userInfo.planCredits !== -1 && (userInfo.credits ?? 0) <= 0) {
    console.log('');
    console.log(chalk.red(`✖  ${t('buildOutOfCredits')}`));
    console.log(chalk.gray(`   ${t('buildOutOfCreditsHint')}`));
    console.log('');
    process.exit(1);
  }
  if (userInfo.planStatus === 'past_due') {
    console.log(chalk.yellow(`⚠  ${t('buildPastDue')}`));
    console.log(chalk.gray('   https://antgo.work/account/billing'));
    console.log('');
  }

  const projectRoot = options.project
    ? path.resolve(options.project)
    : cfg.projectRoot ? path.resolve(cfg.projectRoot) : process.cwd();

  const platformDir = platform === 'android' ? 'android' : 'ios';
  if (!fs.existsSync(path.join(projectRoot, platformDir))) {
    logger.error(t('buildNoPlatformDir', platformDir, projectRoot));
    process.exit(1);
  }

  // 1. Đọc ant.json + app.json
  const profileName   = options.profile || 'production';
  const profileConfig = resolveAntJson(projectRoot, profileName);
  const { distribution, developmentClient } = profileConfig;

  const autoSubmit = !!options.autoSubmit;

  if (autoSubmit && distribution !== 'store') {
    console.log('');
    console.log(chalk.red(`✖  ${t('buildAutoSubmitStoreOnly')}`));
    console.log(chalk.gray(`   ${t('buildAutoSubmitProfileHint', profileName, distribution)}`));
    console.log('');
    process.exit(1);
  }

  const projectInfo = resolveProjectInfo(projectRoot);
  const { buildNumber: configBuildNumber } = projectInfo;
  printHeader([
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
      logger.error(t('buildAppleCredsError') + err.message);
      process.exit(1);
    }
  }

  // 3. Tạo build job → lấy 2 signed URLs (cùng folder trên Storage)
  const spinner = ora(t('buildCreatingJob')).start();
  let jobId, tarUrl, credsUrl;
  try {
    const res = await createBuild(client, {
      projectId: projectInfo.projectId,
      platform,
      autoSubmit,
      ...(configBuildNumber != null && { buildNumber: configBuildNumber }),
      ...(creds?.teamId     && { teamId: creds.teamId }),
    });
    jobId    = res.jobId;
    tarUrl   = res.tarUrl;
    credsUrl = res.credsUrl;
    const resolvedBN = res.buildNumber;
    spinner.succeed(t('buildJobCreated', chalk.bold(jobId), chalk.cyan(resolvedBN)));

    // Upload ASC key lên dashboard (best-effort, không block build)
    if (platform === 'ios' && creds?.ascKey && creds?.teamId) {
      const { keyId, issuerId, privateKeyP8 } = creds.ascKey;
      try {
        await uploadAscKey(client, { teamId: creds.teamId, keyId, issuerId, privateKeyP8 });
        console.log(chalk.green(t('buildAscKeySaved')));
      } catch (err) {
        console.log(chalk.yellow(t('buildAscKeyFailed')) + chalk.gray(err.response?.data?.error ?? err.message));
      }
    }
  } catch (err) {
    spinner.fail(t('buildJobFailed'));
    const msg = err.response?.data?.error ?? err.message;
    const status = err.response?.status;

    if (status === 404 && msg?.includes('không tồn tại')) {
      console.log('');
      console.log(chalk.red(`  ✖  ${t('buildProjectNotFound', projectInfo.projectId)}`));
      console.log('');
      console.log(chalk.yellow(`  ${t('buildProjectNotFoundHint1')}`));
      console.log(`     expo.extra.ant.projectId = "${projectInfo.projectId}"`);
      console.log('');
      console.log(`  ${t('buildProjectNotFoundHint2')} ${chalk.cyan('https://antgo.work/account/apps')}`);
      console.log(`  ${t('buildProjectNotFoundHint3')}`);
    } else {
      logger.error(tError(msg));
    }
    console.log('');
    process.exit(1);
  }

  const tmpDir = path.join(os.tmpdir(), `ant-go-${jobId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // 4. Pack + upload tar.gz
  const tarName = platform === 'android' ? 'android.tar.gz' : 'ios.tar.gz';
  const tarFile = path.join(tmpDir, tarName);
  const packSpinner = ora(t('buildPacking')).start();
  try {
    await packProject(projectRoot, tarFile, platform);
    const sizeMB = (fs.statSync(tarFile).size / 1024 / 1024).toFixed(1);
    packSpinner.succeed(t('buildPackDone', sizeMB));
  } catch (err) {
    packSpinner.fail(t('buildPackFailed'));
    logger.error(err.message);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.exit(1);
  }

  const tarSpinner = ora(t('buildUploading', tarName)).start();
  try {
    await uploadFile(tarUrl, tarFile, 'application/gzip', tarSpinner);
    tarSpinner.succeed(t('buildUploadDone', tarName));
  } catch (err) {
    tarSpinner.fail(t('buildUploadFailed', tarName));
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

    const credsSpinner = ora(t('buildUploading', 'credentials.json')).start();
    try {
      await uploadFile(credsUrl, credsFile, 'application/json', credsSpinner);
      credsSpinner.succeed(t('buildUploadDone', 'credentials.json'));
    } catch (err) {
      credsSpinner.fail(t('buildUploadFailed', 'credentials.json'));
      logger.error(err.message);
      process.exit(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } else {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // 6. Notify server — verify 2 file đã tồn tại và đánh dấu pending
  const startSpinner = ora(t('buildVerifyingFiles')).start();
  try {
    await client.post(`/api/builds/${jobId}/start`);
    startSpinner.succeed(t('buildVerifyDone'));
  } catch (err) {
    startSpinner.fail(t('buildStartFailed'));
    logger.error(tError(err.response?.data?.error ?? err.message));
    process.exit(1);
  }

  // Hiện URL và thoát — user vào web xem log, CLI không poll gì thêm
  const appUrl  = `${API_URL}/account/app/${encodeURIComponent(projectInfo.schemeName)}/builds/${jobId}`;
  const hyperlink = (url, text) => `]8;;${url}\\${text}]8;;\\`;
  console.log('');
  console.log(chalk.bold(t('buildSubmitted')));
  if (autoSubmit) {
    console.log(chalk.gray(`   ${t('buildAutoSubmitNote')}`));
  }
  console.log('');
  console.log(`   ${t('buildTrackAt')}`);
  console.log(`   ${chalk.cyan.underline(hyperlink(appUrl, appUrl))}`);
  console.log('');
  process.exit(0);
}

module.exports = { runBuild };

