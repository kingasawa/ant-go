/**
 * apple-creds.js — Thu thập Apple credentials phía CLI (interactive, hỗ trợ 2FA)
 *
 * Hỗ trợ 2 loại distribution:
 *   store    — Distribution cert + App Store Provisioning Profile
 *   internal — Development cert + Development Provisioning Profile (cần UDID device)
 *
 * Cache per profile tại: ~/.ant-go/creds-<profileName>.json
 */

const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const chalk    = require('chalk');
const inquirer = require('inquirer');
const axios    = require('axios');
const qrcode   = require('qrcode-terminal');
const { API_URL } = require('./config');
const { t } = require('./i18n');

const CACHE_DIR = path.join(os.homedir(), '.ant-go');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 giờ

// ── Capability detection ──────────────────────────────────────────────────────
// Maps entitlement key → ASC CapabilityType value
const ENTITLEMENT_TO_CAPABILITY = {
  'aps-environment':                    'PUSH_NOTIFICATIONS',
  'com.apple.developer.associated-domains': 'ASSOCIATED_DOMAINS',
  'com.apple.security.application-groups': 'APP_GROUPS',
  'com.apple.developer.in-app-payments': 'APPLE_PAY',
  'com.apple.developer.healthkit':      'HEALTHKIT',
  'com.apple.developer.homekit':        'HOMEKIT',
  'com.apple.developer.icloud-container-identifiers': 'ICLOUD',
  'com.apple.developer.siri':           'SIRIKIT',
  'com.apple.developer.networking.networkextension': 'NETWORK_EXTENSIONS',
  'com.apple.developer.nfc.readersession.formats': 'NFC_TAG_READING',
  'com.apple.developer.pass-type-identifiers': 'WALLET',
  'com.apple.developer.personal-vpn':   'PERSONAL_VPN',
  'com.apple.developer.authentication-services.autofill-credential-provider': 'AUTOFILL_CREDENTIAL_PROVIDER',
  'com.apple.developer.ClassKit-environment': 'CLASSKIT',
  'com.apple.developer.default-data-protection': 'DATA_PROTECTION',
  'com.apple.developer.maps':           'MAPS',
  'com.apple.developer.weatherkit':     'WEATHERKIT',
  'com.apple.developer.game-center':    'GAME_CENTER',
  'com.apple.developer.pushkit.access': 'PUSH_TO_TALK',
};

function findEntitlementsFile(iosDir) {
  if (!fs.existsSync(iosDir)) return null;
  // Search top-level and one level deep inside ios/
  const entries = fs.readdirSync(iosDir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.entitlements')) return path.join(iosDir, e.name);
    if (e.isDirectory()) {
      try {
        const sub = fs.readdirSync(path.join(iosDir, e.name), { withFileTypes: true });
        for (const s of sub) {
          if (s.isFile() && s.name.endsWith('.entitlements')) return path.join(iosDir, e.name, s.name);
        }
      } catch {}
    }
  }
  return null;
}

function parseEntitlementKeys(content) {
  const keys = [];
  const regex = /<key>([^<]+)<\/key>/g;
  let match;
  while ((match = regex.exec(content)) !== null) keys.push(match[1].trim());
  return keys;
}

async function syncCapabilities(authCtx, bundleIdObj, entitlementKeys) {
  const { CapabilityTypeOption } = require('@expo/apple-utils');

  const required = [...new Set(entitlementKeys.map(k => ENTITLEMENT_TO_CAPABILITY[k]).filter(Boolean))];

  let current = [];
  try {
    const caps = await bundleIdObj.getBundleIdCapabilitiesAsync();
    current = (caps ?? []).map(c => c.attributes?.capabilityType).filter(Boolean);
  } catch {}

  const toEnable = required.filter(c => !current.includes(c));
  const failed = [];
  for (const capType of toEnable) {
    try {
      await bundleIdObj.updateBundleIdCapabilityAsync({ capabilityType: capType, option: CapabilityTypeOption.ON });
    } catch (err) {
      failed.push({ capType, reason: err.message });
    }
  }

  if (failed.length > 0) {
    console.log(chalk.yellow(`   ⚠  Could not enable: ${failed.map(f => f.capType).join(', ')}`));
  }

  return [...new Set([...current, ...toEnable.filter(c => !failed.find(f => f.capType === c))])];
}

async function getCurrentCapabilities(bundleIdObj) {
  try {
    const caps = await bundleIdObj.getBundleIdCapabilitiesAsync();
    return (caps ?? []).map(c => c.attributes?.capabilityType).filter(Boolean);
  } catch {
    return [];
  }
}

function getCacheFile(profileName) {
  return path.join(CACHE_DIR, `creds-${profileName}.json`);
}

function loadCache(profileName) {
  const file = getCacheFile(profileName);
  if (!fs.existsSync(file)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - d._savedAt > CACHE_TTL) { fs.unlinkSync(file); return null; }
    return d;
  } catch { return null; }
}

function saveCache(creds, profileName) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    getCacheFile(profileName),
    JSON.stringify({ ...creds, _savedAt: Date.now() }, null, 2),
    { mode: 0o600 }
  );
}

function clearCache(profileName) {
  const file = getCacheFile(profileName);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// ── Device enrollment via .mobileconfig ──────────────────────────────────────
// Returns { udid, deviceProduct, deviceSerial }
async function enrollDevice(projectId, apiClient) {
  console.log('');
  console.log(chalk.cyan(t('enrollNewDevice')));
  console.log(chalk.gray(t('enrollQRHint')));
  console.log('');

  let token, enrollUrl;
  try {
    const res = await apiClient.post(`/api/device-enroll/create`, { projectId });
    token     = res.data.token;
    enrollUrl = res.data.enrollUrl;
  } catch (err) {
    throw new Error(t('enrollCreateFailed', err.response?.data?.error || err.message));
  }

  console.log(chalk.bold(t('enrollQRScan')));
  console.log('');
  await new Promise(resolve => qrcode.generate(enrollUrl, { small: true }, (qr) => {
    console.log(qr);
    resolve();
  }));
  console.log('');
  console.log(chalk.gray(t('enrollOrOpen')) + chalk.underline(enrollUrl));
  console.log('');
  console.log(chalk.yellow(t('enrollWaiting')));

  const POLL_INTERVAL = 3000;
  const TIMEOUT       = 10 * 60 * 1000;
  const deadline      = Date.now() + TIMEOUT;
  const spinner       = require('ora')('').start();

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    try {
      const res = await apiClient.get(`/api/device-enroll/${token}/status`);
      const { status, udid, deviceProduct, deviceSerial } = res.data;
      if (status === 'registered' && udid) {
        spinner.succeed(chalk.green(t('enrollConfirmed', deviceProduct || udid, udid)));
        return { udid, deviceProduct: deviceProduct || null, deviceSerial: deviceSerial || null };
      }
      if (status === 'expired') {
        spinner.fail(t('enrollExpired'));
        throw new Error('Device enrollment timeout');
      }
      const remaining = Math.ceil((deadline - Date.now()) / 1000 / 60);
      spinner.text = t('enrollPolling', remaining);
    } catch (err) {
      if (err.message === 'Device enrollment timeout') throw err;
    }
  }

  spinner.fail(t('enrollTimeout'));
  throw new Error('Device enrollment timeout');
}

// ── ASC API Key (App Store Connect) ──────────────────────────────────────────
// Dùng cùng Apple Developer Portal session (authCtx) đã có sau khi login để
// tạo + download ASC API Key (.p8). Cache tại ~/.ant-go/asc-key-{teamId}.json
// (không có TTL vì key không tự hết hạn).
async function ensureAscKey(authCtx, teamId) {
  const { ApiKey, ApiKeyType } = require('@expo/apple-utils');
  const ora = require('ora');
  const cacheFile = path.join(CACHE_DIR, `asc-key-${teamId}.json`);

  // 1. Đọc cache
  let cached = null;
  if (fs.existsSync(cacheFile)) {
    try { cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch {}
  }

  // 2. Nếu có cache → verify key còn tồn tại trên Apple
  if (cached?.keyId && cached?.privateKeyP8) {
    try {
      const existingKeys = await ApiKey.getAsync(authCtx) ?? [];
      const still = existingKeys.find(k => k.id === cached.keyId);
      if (still) {
        console.log(chalk.green(t('ascKeyCached', cached.keyId)));
        return cached;
      }
      // Key bị revoke trên Apple → xoá cache, tạo mới
      fs.unlinkSync(cacheFile);
    } catch {
      // Không verify được (mạng / quyền) → dùng cache
      return cached;
    }
  }

  // 3. Tạo key mới
  const spinner = ora(t('ascKeyCreating')).start();
  try {
    const newKey = await ApiKey.createAsync(authCtx, {
      nickname:       'ant-go',
      roles:          ['ADMIN'],
      allAppsVisible: true,
      keyType:        ApiKeyType.PUBLIC_API,
    });

    const privateKeyP8 = await newKey.downloadAsync();
    if (!privateKeyP8) throw new Error('Download .p8 trả về rỗng');

    // 4. Lấy issuerId từ provider info
    let issuerId = null;
    try {
      const keys = await ApiKey.getAsync(authCtx) ?? [];
      issuerId = keys[0]?.attributes?.provider?.id ?? null;
    } catch {}

    if (!issuerId) {
      spinner.stop();
      console.log(chalk.yellow('\n' + t('ascKeyNoIssuer')));
      console.log(chalk.gray(t('ascKeyIssuerHint')));
      const { inputIssuerId } = await inquirer.prompt([{
        type:     'input',
        name:     'inputIssuerId',
        message:  t('ascKeyIssuerLabel'),
        validate: v => v.trim() ? true : t('appleRequired'),
      }]);
      issuerId = inputIssuerId.trim();
      spinner.start();
    }

    const result = { keyId: newKey.id, issuerId, privateKeyP8, _savedAt: Date.now() };
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), { mode: 0o600 });
    spinner.succeed(t('ascKeyCreated', newKey.id));
    return result;

  } catch (err) {
    spinner.warn(t('ascKeyFailed', err.message));
    return null;
  }
}

// ── Multi-select device UI ────────────────────────────────────────────────────
// Hiển thị danh sách device đã có + option thêm mới.
// Returns: string[] — mảng các UDID được chọn
async function selectDevices(existingDevices, projectId, apiClient) {
  const devices = [...existingDevices];

  // Nếu chưa có device nào → đi thẳng vào enrollment
  if (devices.length === 0) {
    console.log(chalk.gray('   ' + t('appleDevicesNone')));
    const enrolled = await enrollDevice(projectId, apiClient);
    const { deviceName } = await inquirer.prompt([{
      type:    'input',
      name:    'deviceName',
      message: t('appleDeviceName'),
      default: t('appleDeviceDefault'),
    }]);
    await apiClient.post('/api/devices', {
      udid:          enrolled.udid,
      name:          deviceName,
      deviceProduct: enrolled.deviceProduct,
      deviceSerial:  enrolled.deviceSerial,
      source:        'cli',
    });
    return [enrolled.udid];
  }

  // Vòng lặp: hiển thị multi-select, xử lý "Thêm device mới"
  while (true) {
    const choices = [
      ...devices.map(d => ({
        name:    `${(d.name || 'Unnamed').padEnd(18)} ${(d.deviceProduct || '').padEnd(12)} (${d.udid.slice(0, 12)}...)`,
        value:   d.udid,
        checked: true,
      })),
      new inquirer.Separator('─────────────────────────────────────────'),
      { name: chalk.cyan(t('appleDevicesAddNew')), value: '__new__' },
    ];

    console.log('');
    const { selected } = await inquirer.prompt([{
      type:    'checkbox',
      name:    'selected',
      message: t('appleDevicesLabel'),
      choices,
      validate: v => v.length > 0 ? true : t('appleDevicesMustSelect'),
    }]);

    if (!selected.includes('__new__')) return selected;

    // Thêm device mới → enroll → lưu Firestore → quay lại chọn
    const enrolled = await enrollDevice(projectId, apiClient);
    const { deviceName } = await inquirer.prompt([{
      type:    'input',
      name:    'deviceName',
      message: t('appleDeviceName'),
      default: t('appleDeviceDefault'),
    }]);
    const saveSpinner = require('ora')(t('appleDeviceSaving')).start();
    try {
      await apiClient.post('/api/devices', {
        udid:          enrolled.udid,
        name:          deviceName,
        deviceProduct: enrolled.deviceProduct,
        deviceSerial:  enrolled.deviceSerial,
        source:        'cli',
      });
      saveSpinner.succeed(t('appleDeviceSaved', deviceName));
    } catch (err) {
      saveSpinner.fail(t('appleDeviceSaveFailed', err.response?.data?.error || err.message));
    }

    devices.push({ udid: enrolled.udid, name: deviceName, deviceProduct: enrolled.deviceProduct, deviceSerial: enrolled.deviceSerial });
  }
}

// ── Public entry ──────────────────────────────────────────────────────────────
async function ensureAppleCreds(projectInfo, {
  force              = false,
  refreshProfile     = false,
  distribution       = 'store',
  profileName        = 'production',
  userDevices        = [],
  apiClient          = null,
  projectRoot        = null,   // used for entitlements-based capability sync
  _preselectedUdids  = null,   // internal use: skip selectDevices when already chosen
} = {}) {

  // ── Cache check ─────────────────────────────────────────────────────────────
  if (!force && !refreshProfile) {
    const cached = loadCache(profileName);
    if (cached) {
      if (!cached.appleId) {
        clearCache(profileName);
      } else {
        const email   = cached.appleId;
        const teamId  = cached.teamId || '';
        const cachedUdids = cached.udids ?? (cached.udid ? [cached.udid] : []);
        const udidHint = distribution === 'internal' && cachedUdids.length > 0
          ? `  Devices: ${cachedUdids.length}` : '';
        const label = [email, teamId ? `(${teamId})` : '', udidHint].filter(Boolean).join('   ');
        console.log('');
        const { useCache } = await inquirer.prompt([{
          type:    'list',
          name:    'useCache',
          message: t('appleLoginPrompt'),
          choices: [
            { name: t('appleUseCache', label), value: true },
            { name: t('appleLoginOther'),       value: false },
          ],
        }]);

        if (useCache) {
          // internal: luôn hỏi chọn device, dù dùng cache
          if (distribution === 'internal') {
            // Merge cached udids vào userDevices để hiện đủ danh sách dù Firestore chưa có
            const cachedDevices = cachedUdids
              .filter(u => !userDevices.find(d => d.udid === u))
              .map(u => ({ udid: u, name: 'Device (cached)', deviceProduct: null }));
            const mergedDevices = [...userDevices, ...cachedDevices];

            const selectedUdids = await selectDevices(mergedDevices, projectInfo.projectId, apiClient);
            const sameDevices = selectedUdids.length === cachedUdids.length
              && selectedUdids.every(u => cachedUdids.includes(u));

            if (sameDevices) {
              return { ...cached, udids: selectedUdids, ...projectInfo };
            } else {
              clearCache(profileName);
              return await ensureAppleCreds(projectInfo, {
                force: true, refreshProfile: true,
                distribution, profileName,
                userDevices, apiClient,
                _preselectedUdids: selectedUdids,
              });
            }
          }
          return { ...cached, ...projectInfo };
        }
        clearCache(profileName);
      }
    }
  }

  const {
    Auth, Teams, Certificate, CertificateType,
    createCertificateAndP12Async, BundleId, Profile, ProfileType, Device,
  } = require('@expo/apple-utils');

  console.log('');
  console.log(chalk.yellow.bold(t('appleCredsLogin')));
  console.log('');

  // ── Apple ID + password ──────────────────────────────────────────────────────
  const { appleId, password } = await inquirer.prompt([
    {
      type:     'input',
      name:     'appleId',
      message:  t('appleIdLabel'),
      validate: v => v.trim() ? true : t('appleRequired'),
    },
    {
      type:     'password',
      name:     'password',
      message:  t('applePasswordLabel'),
      mask:     '•',
      validate: v => v.trim() ? true : t('appleRequired'),
    },
  ]);

  console.log('');

  // Không dùng spinner ở đây vì @expo/apple-utils có spinner nội bộ riêng.
  // Nếu cả hai cùng chạy, spinner của chúng ta sẽ overwrite readline prompt 2FA.
  let authCtx, teamId;
  try {
    const result = await Auth.loginAsync({
      username: appleId.trim(),
      password: password.trim(),
    }, {
      serviceKey: undefined,
      onTwoFactorRequest: async () => {
        // Apple-utils đã dừng spinner nội bộ của nó trước khi gọi callback này.
        // Dùng readline trực tiếp — đơn giản và không bị xung đột terminal.
        process.stdout.write('\n🔐  ' + t('apple2FA') + ' ');

        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        const code = await new Promise(resolve => rl.on('line', line => { rl.close(); resolve(line.trim()); }));

        console.log(chalk.gray(t('apple2FAVerifying')));
        return code;
      },
    });
    authCtx = result.context ?? result;
    console.log(chalk.green('✔  ' + t('appleLoginSuccess')));
  } catch (err) {
    console.log(chalk.red('✖  ' + t('appleLoginFailed', err.message)));
    throw err;
  }

  // ── Team selection ───────────────────────────────────────────────────────────
  const teamSpinner = require('ora')(t('appleLoadingTeam')).start();
  try {
    const teams = await Teams.getTeamsAsync(authCtx);
    teamSpinner.stop();
    if (!teams || teams.length === 0) throw new Error(t('appleNoTeam'));

    if (teams.length === 1) {
      teamId = teams[0].teamId;
      console.log(chalk.green(`✔  Team: ${teams[0].name} (${teamId})`));
    } else {
      const { selectedTeam } = await inquirer.prompt([{
        type:    'list',
        name:    'selectedTeam',
        message: t('appleSelectTeam'),
        choices: teams.map(tm => ({ name: `${tm.name} (${tm.teamId}) — ${tm.type}`, value: tm.teamId })),
      }]);
      teamId = selectedTeam;
    }
    await Teams.selectTeamAsync(authCtx, { teamId });
  } catch (err) {
    teamSpinner.fail(t('appleTeamFailed', err.message));
    throw err;
  }

  // ── ASC API Key (chỉ store distribution) ────────────────────────────────────
  let ascKey = null;
  if (distribution === 'store') {
    ascKey = await ensureAscKey(authCtx, teamId);
  }

  // ── Device selection + enrollment (internal only) ────────────────────────────
  let selectedUdids = [];
  let deviceIds     = [];
  if (distribution === 'internal') {
    selectedUdids = _preselectedUdids ?? await selectDevices(userDevices, projectInfo.projectId, apiClient);

    // Đồng bộ từng UDID lên Apple Developer Portal
    const appleDevicesAll = await Device.getAsync(authCtx, {});
    const syncSpinner = require('ora')(t('appleDeviceSyncing', selectedUdids.length)).start();
    try {
      for (const udid of selectedUdids) {
        const existing = appleDevicesAll.find(
          d => d.attributes?.udid?.toLowerCase() === udid.toLowerCase()
        );
        if (existing) {
          deviceIds.push(existing.id);
        } else {
          const deviceEntry = userDevices.find(d => d.udid === udid);
          const newDevice = await Device.createAsync(authCtx, {
            name: deviceEntry?.name || t('appleDeviceDefault'), udid, platform: 'IOS',
          });
          deviceIds.push(newDevice.id);
        }
      }
      syncSpinner.succeed(t('appleDeviceSynced', deviceIds.length));
    } catch (err) {
      syncSpinner.fail(t('appleDeviceSyncFailed', err.message));
      throw err;
    }
  }

  // ── Certificate ──────────────────────────────────────────────────────────────
  const certType   = distribution === 'internal' ? CertificateType.DEVELOPMENT : CertificateType.DISTRIBUTION;
  const certLabel  = distribution === 'internal' ? 'Development' : 'Distribution';
  const certSpinner = require('ora')(t('certLoading', certLabel)).start();
  let p12Base64, p12Password, certId;
  let createdNewCert = false;
  try {
    const existing = await Certificate.getAsync(authCtx, {
      query: { filter: { certificateType: [certType] } },
    });

    if (existing.length > 0) {
      const result = await createCertificateAndP12Async(authCtx, {
        certificateType: certType, reuseExistingCertificate: true,
      }).catch(() => null);
      if (result) {
        // Use certId from the result — createCertificateAndP12Async may pick
        // a different cert than existing[0] (whichever has a private key locally).
        // certId and p12 must always refer to the same certificate.
        certId      = result.certificate?.id ?? existing[0].id;
        p12Base64   = result.certificateP12;
        p12Password = result.password ?? '';
        certSpinner.succeed(t('certReused', certLabel, certId));
      } else {
        // Private key không còn local → revoke TẤT CẢ cert cũ rồi tạo mới.
        // Phải xoá hết vì Apple không cho tạo mới khi còn cert active.
        certSpinner.text = `${t('certLoading', certLabel)} (revoking ${existing.length} old cert(s)...)`;
        for (const cert of existing) {
          try {
            await Certificate.deleteAsync(authCtx, { id: cert.id });
          } catch (delErr) {
            certSpinner.warn(`Could not revoke cert ${cert.id}: ${delErr.message}`);
            certSpinner.start();
          }
        }
        const newResult = await createCertificateAndP12Async(authCtx, { certificateType: certType });
        const certsAfter = await Certificate.getAsync(authCtx, { query: { filter: { certificateType: [certType] } } });
        const existingIds = new Set(existing.map(c => c.id));
        const newCert = certsAfter.find(c => !existingIds.has(c.id));
        certId        = newCert?.id ?? newResult.certificate?.id;
        p12Base64     = newResult.certificateP12;
        p12Password   = newResult.password ?? '';
        createdNewCert = true;
        certSpinner.succeed(t('certNew', certLabel, certId));
      }
    } else {
      const result = await createCertificateAndP12Async(authCtx, { certificateType: certType });
      const certsAfter = await Certificate.getAsync(authCtx, { query: { filter: { certificateType: [certType] } } });
      const newCert = certsAfter.find(c => !existing.find(e => e.id === c.id));
      certId        = newCert?.id ?? result.certificate?.id;
      p12Base64     = result.certificateP12;
      p12Password   = result.password ?? '';
      createdNewCert = true;
      certSpinner.succeed(t('certNew', certLabel, certId));
    }
  } catch (err) {
    certSpinner.fail(t('certFailed', certLabel, err.message));
    throw err;
  }

  // ── Provisioning Profile ─────────────────────────────────────────────────────
  const profileType  = distribution === 'internal' ? ProfileType.IOS_APP_DEVELOPMENT : ProfileType.IOS_APP_STORE;
  const profileLabel = distribution === 'internal' ? 'Development' : 'App Store';
  const profileSpinner = require('ora')(t('profileLoading', profileLabel)).start();
  let mobileprovisionBase64;
  try {
    const allBundleIds = await BundleId.getAsync(authCtx, {});
    let bundleIdObj = allBundleIds.find(b => b.attributes?.identifier === projectInfo.bundleId);
    if (!bundleIdObj) {
      profileSpinner.text = t('profileRegisteringId', projectInfo.bundleId);
      bundleIdObj = await BundleId.createAsync(authCtx, {
        name: projectInfo.bundleId,
        identifier: projectInfo.bundleId,
        platform: 'IOS',
      });
    }

    const allProfiles = await Profile.getAsync(authCtx, {
      query: { filter: { profileType: [profileType] } },
    });
    const existingProfile = allProfiles.find(
      p => p.attributes?.bundleId?.attributes?.identifier === projectInfo.bundleId
    );

    let profile = null;

    if (existingProfile?.attributes?.profileState === 'ACTIVE' && !createdNewCert && !refreshProfile) {
      const profileCertIds = (existingProfile.attributes?.certificates ?? []).map(c => c.id);
      if (profileCertIds.includes(certId)) {
        profile = existingProfile;
        profileSpinner.text = t('profileReusing', profileLabel);
      } else {
        profileSpinner.text = t('profileCertMismatch');
        await Profile.deleteAsync(authCtx, { id: existingProfile.id });
      }
    } else if (existingProfile) {
      profileSpinner.text = refreshProfile
        ? t('profileCapChanged')
        : createdNewCert ? t('profileNewCert') : t('profileInvalid');
      await Profile.deleteAsync(authCtx, { id: existingProfile.id });
    }

    let capabilities = [];
    if (!profile) {
      // Sync capabilities from .entitlements before creating profile (store only)
      if (distribution === 'store' && projectRoot) {
        const entFile = findEntitlementsFile(path.join(projectRoot, 'ios'));
        if (entFile) {
          profileSpinner.text = 'Syncing capabilities from entitlements…';
          try {
            const entKeys = parseEntitlementKeys(fs.readFileSync(entFile, 'utf8'));
            capabilities = await syncCapabilities(authCtx, bundleIdObj, entKeys);
            if (capabilities.length > 0) {
              profileSpinner.text = `Capabilities enabled: ${capabilities.join(', ')}`;
            }
          } catch (err) {
            console.log(chalk.yellow(`\n   ⚠  Capability sync skipped: ${err.message}`));
          }
        }
      }

      const profileName_ = `${profileLabel} ${new Date().toISOString().slice(0, 10)}`;
      profileSpinner.text = t('profileLoading', profileLabel);
      profile = await Profile.createAsync(authCtx, {
        bundleId: bundleIdObj.id, certificates: [certId],
        devices: deviceIds, name: profileName_, profileType,
      });
    } else {
      // Reusing existing — still fetch current capabilities for dashboard display
      capabilities = await getCurrentCapabilities(bundleIdObj);
    }

    const fresh = await Profile.infoAsync(authCtx, { id: profile.id });
    const data  = fresh.attributes?.profileContent ?? profile.attributes?.profileContent;
    if (!data) throw new Error(t('profileNoContent'));
    mobileprovisionBase64 = typeof data === 'string' ? data : Buffer.from(data).toString('base64');
    profileSpinner.succeed(t('profileOK', profileLabel));

    const creds = { appleId: appleId.trim(), p12Base64, p12Password, mobileprovisionBase64, teamId, udids: selectedUdids, ascKey, capabilities };
    saveCache(creds, profileName);
    console.log(chalk.green(t('credsCached', getCacheFile(profileName))));
    console.log('');

    return { ...creds, ...projectInfo };
  } catch (err) {
    profileSpinner.fail(t('profileFailed', profileLabel, err.message));
    throw err;
  }
}

module.exports = { ensureAppleCreds, ensureAscKey, loadCache, clearCache, getCacheFile };
