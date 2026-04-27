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

const CACHE_DIR = path.join(os.homedir(), '.ant-go');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 giờ

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
async function enrollDevice(projectId) {
  console.log('');
  console.log(chalk.cyan('📱  Đăng ký device để cài app development'));
  console.log(chalk.gray('   iPhone sẽ tự động gửi UDID khi quét mã QR bên dưới'));
  console.log('');

  // Create enrollment session
  let token, enrollUrl;
  try {
    const res = await axios.post(`${API_URL}/api/device-enroll/create`, { projectId });
    token     = res.data.token;
    enrollUrl = res.data.enrollUrl;
  } catch (err) {
    throw new Error('Không tạo được enrollment session: ' + (err.response?.data?.error || err.message));
  }

  // Show QR code
  console.log(chalk.bold('Quét QR code bằng Camera app trên iPhone:'));
  console.log('');
  await new Promise(resolve => qrcode.generate(enrollUrl, { small: true }, resolve));
  console.log('');
  console.log(chalk.gray('Hoặc mở URL: ') + chalk.underline(enrollUrl));
  console.log('');
  console.log(chalk.yellow('Đang chờ iPhone xác nhận...'));

  // Poll for UDID
  const POLL_INTERVAL = 3000;
  const TIMEOUT = 10 * 60 * 1000; // 10 minutes
  const deadline = Date.now() + TIMEOUT;
  const spinner = require('ora')('').start();

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    try {
      const res = await axios.get(`${API_URL}/api/device-enroll/${token}/status`);
      const { status, udid, deviceProduct } = res.data;
      if (status === 'registered' && udid) {
        spinner.succeed(chalk.green(`Device đã xác nhận: ${deviceProduct || udid}  (${udid})`));
        return udid;
      }
      if (status === 'expired') {
        spinner.fail('Enrollment đã hết hạn (10 phút)');
        throw new Error('Device enrollment timeout');
      }
      const remaining = Math.ceil((deadline - Date.now()) / 1000 / 60);
      spinner.text = `Chờ iPhone quét QR... (còn ${remaining} phút)`;
    } catch (err) {
      if (err.message === 'Device enrollment timeout') throw err;
      // network hiccup — keep polling
    }
  }

  spinner.fail('Hết thời gian chờ (10 phút)');
  throw new Error('Device enrollment timeout');
}

// ── Public entry ──────────────────────────────────────────────────────────────
async function ensureAppleCreds(projectInfo, {
  force          = false,
  refreshProfile = false,
  distribution   = 'store',
  profileName    = 'production',
} = {}) {

  // ── Cache check ─────────────────────────────────────────────────────────────
  if (!force && !refreshProfile) {
    const cached = loadCache(profileName);
    if (cached) {
      if (!cached.appleId) {
        clearCache(profileName);
      } else {
        const email  = cached.appleId;
        const teamId = cached.teamId || '';
        const udidHint = distribution === 'internal' && cached.udid
          ? `  UDID: ${cached.udid.slice(0, 8)}…`
          : '';
        const label = [email, teamId ? `(${teamId})` : '', udidHint]
          .filter(Boolean).join('   ');
        console.log('');
        const { useCache } = await inquirer.prompt([{
          type:    'list',
          name:    'useCache',
          message: 'Đăng nhập tài khoản Apple Developer',
          choices: [
            { name: `Đăng nhập  tài khoản ${label}`, value: true },
            { name: 'Đăng nhập tài khoản khác',      value: false },
          ],
        }]);
        if (useCache) return { ...cached, ...projectInfo };
        clearCache(profileName);
      }
    }
  }

  const {
    Auth,
    Teams,
    Certificate,
    CertificateType,
    createCertificateAndP12Async,
    BundleId,
    Profile,
    ProfileType,
    Device,
  } = require('@expo/apple-utils');

  console.log('');
  console.log(chalk.yellow.bold('🔐  Cần đăng nhập Apple Developer để lấy certificate & provisioning profile'));
  console.log('');

  // ── Apple ID + password ──────────────────────────────────────────────────────
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
      validate: v => v.trim() ? true : 'Bắt buộc',
    },
  ]);

  console.log('');
  const loginSpinner = require('ora')('Đang đăng nhập Apple Developer...').start();

  let authCtx, teamId;
  try {
    const result = await Auth.loginAsync({
      username: appleId.trim(),
      password: password.trim(),
    }, {
      serviceKey: undefined,
      onTwoFactorRequest: async () => {
        loginSpinner.stop();
        const { code } = await inquirer.prompt([{
          type:     'input',
          name:     'code',
          message:  '🔐 Nhập mã 2FA từ iPhone/Mac của bạn:',
          validate: v => /^\d{6}$/.test(v.trim()) ? true : 'Mã 6 chữ số',
        }]);
        loginSpinner.start('Đang xác thực 2FA...');
        return code.trim();
      },
    });
    authCtx = result.context ?? result;
    loginSpinner.succeed('Đăng nhập thành công');
  } catch (err) {
    loginSpinner.fail('Đăng nhập thất bại: ' + err.message);
    throw err;
  }

  // ── Team selection ───────────────────────────────────────────────────────────
  const teamSpinner = require('ora')('Đang lấy thông tin team...').start();
  try {
    const teams = await Teams.getTeamsAsync(authCtx);
    teamSpinner.stop();
    if (!teams || teams.length === 0) throw new Error('Không tìm thấy Apple Developer team nào');

    if (teams.length === 1) {
      teamId = teams[0].teamId;
      console.log(chalk.green(`✔  Team: ${teams[0].name} (${teamId})`));
    } else {
      const { selectedTeam } = await inquirer.prompt([{
        type:    'list',
        name:    'selectedTeam',
        message: 'Chọn Apple Developer Team:',
        choices: teams.map(t => ({ name: `${t.name} (${t.teamId}) — ${t.type}`, value: t.teamId })),
      }]);
      teamId = selectedTeam;
    }
    await Teams.selectTeamAsync(authCtx, { teamId });
  } catch (err) {
    teamSpinner.fail('Không lấy được thông tin team: ' + err.message);
    throw err;
  }

  // ── UDID via .mobileconfig enrollment (internal only) ───────────────────────
  let udid, deviceId;
  if (distribution === 'internal') {
    udid = await enrollDevice(projectInfo.projectId || projectInfo.bundleId);
    const deviceSpinner = require('ora')('Đang đăng ký device trên Apple Developer...').start();
    try {
      const devices = await Device.getAsync(authCtx, {});
      const existing = devices.find(d => d.attributes?.udid?.toLowerCase() === udid.toLowerCase());
      if (existing) {
        deviceId = existing.id;
        deviceSpinner.succeed(`Device đã đăng ký: ${existing.attributes?.name || udid}`);
      } else {
        deviceSpinner.stop();
        const { deviceName } = await inquirer.prompt([{
          type:    'input',
          name:    'deviceName',
          message: 'Tên device (để dễ nhận biết):',
          default: 'My iPhone',
        }]);
        const registerSpinner = require('ora')('Đang đăng ký device...').start();
        const newDevice = await Device.createAsync(authCtx, {
          name:     deviceName,
          udid,
          platform: 'IOS',
        });
        deviceId = newDevice.id;
        registerSpinner.succeed(`Device đã đăng ký: ${deviceName}`);
      }
    } catch (err) {
      deviceSpinner.fail('Lỗi khi kiểm tra/đăng ký device: ' + err.message);
      throw err;
    }
  }

  // ── Certificate ──────────────────────────────────────────────────────────────
  const certType   = distribution === 'internal' ? CertificateType.DEVELOPMENT : CertificateType.DISTRIBUTION;
  const certLabel  = distribution === 'internal' ? 'Development' : 'Distribution';
  const certSpinner = require('ora')(`Đang lấy ${certLabel} Certificate...`).start();
  let p12Base64, p12Password, certId;
  let createdNewCert = false;
  try {
    const existing = await Certificate.getAsync(authCtx, {
      query: { filter: { certificateType: [certType] } },
    });

    if (existing.length > 0) {
      certId = existing[0].id;
      const result = await createCertificateAndP12Async(authCtx, {
        certificateType: certType,
        reuseExistingCertificate: true,
      }).catch(() => null);
      if (result) {
        p12Base64   = result.certificateP12;
        p12Password = result.password ?? '';
      } else {
        const existingIds = new Set(existing.map(c => c.id));
        const newResult = await createCertificateAndP12Async(authCtx, { certificateType: certType });
        const certsAfter = await Certificate.getAsync(authCtx, { query: { filter: { certificateType: [certType] } } });
        const newCert = certsAfter.find(c => !existingIds.has(c.id));
        certId        = newCert?.id ?? newResult.certificate?.id;
        p12Base64     = newResult.certificateP12;
        p12Password   = newResult.password ?? '';
        createdNewCert = true;
      }
      certSpinner.succeed(`${certLabel} Certificate (reused): ${certId}`);
    } else {
      const result = await createCertificateAndP12Async(authCtx, { certificateType: certType });
      const certsAfter = await Certificate.getAsync(authCtx, { query: { filter: { certificateType: [certType] } } });
      const newCert = certsAfter.find(c => !existing.find(e => e.id === c.id));
      certId        = newCert?.id ?? result.certificate?.id;
      p12Base64     = result.certificateP12;
      p12Password   = result.password ?? '';
      createdNewCert = true;
      certSpinner.succeed(`${certLabel} Certificate (new): ${certId}`);
    }
  } catch (err) {
    certSpinner.fail(`Lỗi ${certLabel} cert: ` + err.message);
    throw err;
  }

  // ── Provisioning Profile ─────────────────────────────────────────────────────
  const profileType  = distribution === 'internal' ? ProfileType.IOS_APP_DEVELOPMENT : ProfileType.IOS_APP_STORE;
  const profileLabel = distribution === 'internal' ? 'Development' : 'App Store';
  const profileSpinner = require('ora')(`Đang lấy ${profileLabel} Provisioning Profile...`).start();
  let mobileprovisionBase64;
  try {
    const allBundleIds = await BundleId.getAsync(authCtx, {});
    const bundleIdObj  = allBundleIds.find(b => b.attributes?.identifier === projectInfo.bundleId);
    if (!bundleIdObj) throw new Error(`App ID "${projectInfo.bundleId}" không tồn tại trên Apple Developer`);

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
        profileSpinner.text = `Reusing existing ${profileLabel} profile...`;
      } else {
        profileSpinner.text = 'Profile không khớp cert → đang tạo lại...';
        await Profile.deleteAsync(authCtx, { id: existingProfile.id });
      }
    } else if (existingProfile) {
      profileSpinner.text = refreshProfile
        ? 'Capabilities thay đổi → đang tạo lại profile...'
        : createdNewCert ? 'Cert mới → đang tạo lại profile...' : 'Profile không hợp lệ → đang tạo lại...';
      await Profile.deleteAsync(authCtx, { id: existingProfile.id });
    }

    if (!profile) {
      const profileName_ = `${profileLabel} ${new Date().toISOString().slice(0, 10)}`;
      profile = await Profile.createAsync(authCtx, {
        bundleId:     bundleIdObj.id,
        certificates: [certId],
        devices:      deviceId ? [deviceId] : [],
        name:         profileName_,
        profileType,
      });
    }

    const fresh = await Profile.infoAsync(authCtx, { id: profile.id });
    const data  = fresh.attributes?.profileContent ?? profile.attributes?.profileContent;
    if (!data) throw new Error('Profile không có nội dung');
    mobileprovisionBase64 = typeof data === 'string' ? data : Buffer.from(data).toString('base64');
    profileSpinner.succeed(`${profileLabel} Provisioning Profile OK`);
  } catch (err) {
    profileSpinner.fail(`Lỗi ${profileLabel} profile: ` + err.message);
    throw err;
  }

  const creds = { appleId: appleId.trim(), p12Base64, p12Password, mobileprovisionBase64, teamId, udid };
  saveCache(creds, profileName);
  console.log(chalk.green('✔  Credentials đã cache tại: ') + chalk.gray(getCacheFile(profileName)));
  console.log('');

  return { ...creds, ...projectInfo };
}

module.exports = { ensureAppleCreds, loadCache, clearCache, getCacheFile };
