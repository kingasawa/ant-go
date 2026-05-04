/**
 * i18n.js — Bilingual support: Vietnamese (default) + English
 * Language stored in ~/.ant-go/config.json → lang
 */

const { loadConfig } = require('./config');

const MESSAGES = {
  // ── auth ────────────────────────────────────────────────────────────────────
  alreadyLoggedIn: {
    vi: (email) => `Bạn đã đăng nhập với tài khoản: ${email}`,
    en: (email) => `Already logged in as: ${email}`,
  },
  logoutHint: {
    vi: 'Chạy `ant auth logout` nếu muốn đăng nhập tài khoản khác.',
    en: 'Run `ant auth logout` to switch accounts.',
  },
  loginTitle: {
    vi: 'Đăng nhập vào ant',
    en: 'Login to ant',
  },
  loginBrowserHint: {
    vi: 'Dùng --browser để đăng nhập với Google',
    en: 'Use --browser to login with Google',
  },
  loginEmailLabel: {
    vi: 'Email:',
    en: 'Email:',
  },
  loginPasswordLabel: {
    vi: 'Mật khẩu:',
    en: 'Password:',
  },
  loginEmailInvalid: {
    vi: 'Email không hợp lệ',
    en: 'Invalid email',
  },
  loginLoading: {
    vi: 'Đang đăng nhập...',
    en: 'Logging in...',
  },
  loginSuccess: {
    vi: 'Đăng nhập thành công!',
    en: 'Logged in successfully!',
  },
  loginFailed: {
    vi: 'Đăng nhập thất bại',
    en: 'Login failed',
  },
  loginNoAccount: {
    vi: 'Chưa có tài khoản?',
    en: "Don't have an account yet?",
  },
  loginRegisterAt: {
    vi: 'Đăng ký tại:',
    en: 'Register at:',
  },
  browserOpening: {
    vi: 'Đang mở browser để đăng nhập với Google...',
    en: 'Opening browser for Google login...',
  },
  browserManual: {
    vi: 'Nếu browser không tự mở:',
    en: 'If browser did not open:',
  },
  browserSuccess: {
    vi: '✓ Đăng nhập thành công!',
    en: '✓ Logged in successfully!',
  },
  browserSuccessClose: {
    vi: 'Bạn có thể đóng tab này và quay lại terminal.',
    en: 'You can close this tab and return to the terminal.',
  },
  browserTimeout: {
    vi: 'Timeout: quá 5 phút không hoàn tất đăng nhập',
    en: 'Timeout: login not completed within 5 minutes',
  },
  notLoggedIn: {
    vi: 'Bạn chưa đăng nhập.',
    en: 'You are not logged in.',
  },
  logoutSuccess: {
    vi: '✓ Đã đăng xuất thành công.',
    en: '✓ Logged out successfully.',
  },
  whoamiTitle: {
    vi: 'Thông tin tài khoản:',
    en: 'Account info:',
  },
  whoamiEmail: {
    vi: 'Email:',
    en: 'Email:',
  },
  whoamiName: {
    vi: 'Tên:',
    en: 'Name:',
  },
  whoamiPlan: {
    vi: 'Plan:',
    en: 'Plan:',
  },
  whoamiCredits: {
    vi: 'Credits:',
    en: 'Credits:',
  },
  whoamiExpired: {
    vi: 'Đã hết hạn — chạy: ant auth login',
    en: 'Expired — run: ant auth login',
  },
  whoamiExpires: {
    vi: 'Hết hạn:',
    en: 'Expires:',
  },
  sessionRenewing: {
    vi: 'Đang gia hạn phiên đăng nhập...',
    en: 'Renewing session...',
  },
  sessionRenewed: {
    vi: 'Phiên đăng nhập đã được gia hạn',
    en: 'Session renewed',
  },
  sessionRenewFailed: {
    vi: 'Không thể gia hạn phiên',
    en: 'Failed to renew session',
  },
  sessionExpired: {
    vi: 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.',
    en: 'You are not logged in or your session has expired.',
  },
  runLoginHint: {
    vi: 'Chạy: ant auth login',
    en: 'Run: ant auth login',
  },

  // ── build ───────────────────────────────────────────────────────────────────
  buildNoPlatform: {
    vi: 'Thiếu flag --platform',
    en: 'Missing --platform flag',
  },
  buildPlatformSupported: {
    vi: 'Nền tảng hỗ trợ:',
    en: 'Supported platforms:',
  },
  buildPlatformInvalid: {
    vi: (p) => `--platform không hợp lệ: "${p}"`,
    en: (p) => `Invalid --platform: "${p}"`,
  },
  buildPlatformOnly: {
    vi: `Chỉ chấp nhận: ios hoặc android`,
    en: `Only accepted: ios or android`,
  },
  buildExample: {
    vi: '$ ant build --platform ios',
    en: '$ ant build --platform ios',
  },
  buildUsage: {
    vi: 'Cách dùng:',
    en: 'Usage:',
  },
  buildLoadingAccount: {
    vi: 'Đang tải thông tin tài khoản...',
    en: 'Loading account info...',
  },
  buildLoadAccountFailed: {
    vi: 'Không tải được thông tin tài khoản',
    en: 'Failed to load account info',
  },
  buildCreditsRemaining: {
    vi: (plan, credits) => `Plan: ${plan}  ·  Credits còn lại: ${credits}`,
    en: (plan, credits) => `Plan: ${plan}  ·  Credits remaining: ${credits}`,
  },
  buildOutOfCredits: {
    vi: 'Bạn đã hết credit build.',
    en: 'You have run out of build credits.',
  },
  buildOutOfCreditsHint: {
    vi: 'Nâng cấp plan hoặc chờ reset đầu tháng tại: https://antgo.work/account/billing',
    en: 'Upgrade your plan or wait for monthly reset at: https://antgo.work/account/billing',
  },
  buildPastDue: {
    vi: 'Thanh toán thất bại — vui lòng cập nhật thông tin thanh toán.',
    en: 'Payment failed — please update your billing information.',
  },
  buildNoPlatformDir: {
    vi: (dir, root) => `Không tìm thấy thư mục ${dir}/ trong: ${root}`,
    en: (dir, root) => `Could not find ${dir}/ directory in: ${root}`,
  },
  buildAutoSubmitStoreOnly: {
    vi: '--auto-submit chỉ dùng được với distribution: store',
    en: '--auto-submit only works with distribution: store',
  },
  buildAutoSubmitProfileHint: {
    vi: (name, dist) => `Profile "${name}" đang dùng distribution: ${dist}`,
    en: (name, dist) => `Profile "${name}" uses distribution: ${dist}`,
  },
  buildCreatingJob: {
    vi: 'Đang tạo build job...',
    en: 'Creating build job...',
  },
  buildJobCreated: {
    vi: (id, bn) => `Job tạo thành công: ${id}  ·  Build #${bn}`,
    en: (id, bn) => `Job created: ${id}  ·  Build #${bn}`,
  },
  buildAscKeySaved: {
    vi: '✔  ASC API Key đã lưu vào dashboard',
    en: '✔  ASC API Key saved to dashboard',
  },
  buildAscKeyFailed: {
    vi: '⚠  Không lưu được ASC API Key: ',
    en: '⚠  Failed to save ASC API Key: ',
  },
  buildJobFailed: {
    vi: 'Tạo build job thất bại',
    en: 'Failed to create build job',
  },
  buildProjectNotFound: {
    vi: (id) => `Project ID "${id}" không tồn tại trên hệ thống.`,
    en: (id) => `Project ID "${id}" does not exist on the system.`,
  },
  buildProjectNotFoundHint1: {
    vi: 'Hãy kiểm tra lại projectId trong app.json:',
    en: 'Please check the projectId in app.json:',
  },
  buildProjectNotFoundHint2: {
    vi: 'Tạo project tại:',
    en: 'Create a project at:',
  },
  buildProjectNotFoundHint3: {
    vi: 'Sau đó copy Project ID vào app.json.',
    en: 'Then copy the Project ID into app.json.',
  },
  buildPacking: {
    vi: 'Đang nén project...',
    en: 'Packing project...',
  },
  buildPackDone: {
    vi: (mb) => `Project đã nén: ${mb} MB`,
    en: (mb) => `Project packed: ${mb} MB`,
  },
  buildPackFailed: {
    vi: 'Lỗi khi nén project',
    en: 'Failed to pack project',
  },
  buildUploading: {
    vi: (file) => `Đang upload ${file}...`,
    en: (file) => `Uploading ${file}...`,
  },
  buildUploadDone: {
    vi: (file) => `Upload ${file} hoàn tất`,
    en: (file) => `Upload ${file} complete`,
  },
  buildUploadFailed: {
    vi: (file) => `Lỗi khi upload ${file}`,
    en: (file) => `Failed to upload ${file}`,
  },
  buildUploadProgress: {
    vi: (pct, up, total) => `Đang upload... ${pct}% (${up} / ${total} MB)`,
    en: (pct, up, total) => `Uploading... ${pct}% (${up} / ${total} MB)`,
  },
  buildVerifyingFiles: {
    vi: 'Đang kiểm tra files...',
    en: 'Verifying files...',
  },
  buildVerifyDone: {
    vi: 'Đã kiểm tra đầy đủ files',
    en: 'All files verified',
  },
  buildStartFailed: {
    vi: 'Không thể khởi động build',
    en: 'Failed to start build',
  },
  buildSubmitted: {
    vi: 'Build đã được gửi lên server!',
    en: 'Build submitted to server!',
  },
  buildAutoSubmitNote: {
    vi: '✈  Auto Submit: bật — IPA sẽ tự động được gửi lên TestFlight sau khi build xong.',
    en: '✈  Auto Submit: on — IPA will be automatically submitted to TestFlight after build.',
  },
  buildTrackAt: {
    vi: 'Theo dõi tiến trình tại:',
    en: 'Track progress at:',
  },
  buildAppleCredsError: {
    vi: 'Không lấy được Apple credentials: ',
    en: 'Failed to get Apple credentials: ',
  },
  // ant.json
  antJsonCreated: {
    vi: '📄  Đã tạo ant.json với các profile mặc định:',
    en: '📄  Created ant.json with default profiles:',
  },
  antJsonParseFailed: {
    vi: 'Không thể parse ant.json',
    en: 'Failed to parse ant.json',
  },
  antJsonProfileNotFound: {
    vi: (name) => `Profile "${name}" không tồn tại trong ant.json`,
    en: (name) => `Profile "${name}" does not exist in ant.json`,
  },
  antJsonProfilesAvailable: {
    vi: '   Profiles hiện có:',
    en: '   Available profiles:',
  },
  // app.json
  appJsonNotFound: {
    vi: (path) => `Không tìm thấy app.json tại: ${path}`,
    en: (path) => `app.json not found at: ${path}`,
  },
  appJsonParseFailed: {
    vi: 'Không thể parse app.json',
    en: 'Failed to parse app.json',
  },
  appJsonNoProjectId: {
    vi: '⚠  Chưa có projectId trong app.json → expo.extra.ant.projectId',
    en: '⚠  Missing projectId in app.json → expo.extra.ant.projectId',
  },
  appJsonNoProjectIdHint: {
    vi: 'Vào https://antgo.work để lấy Project ID',
    en: 'Go to https://antgo.work to get your Project ID',
  },
  appJsonNoBundleId: {
    vi: 'Thiếu bundleId — thêm expo.extra.ant.bundleId hoặc expo.ios.bundleIdentifier vào app.json',
    en: 'Missing bundleId — add expo.extra.ant.bundleId or expo.ios.bundleIdentifier to app.json',
  },
  // ── apple creds ─────────────────────────────────────────────────────────────
  appleCredsLogin: {
    vi: '🔐  Cần đăng nhập Apple Developer để lấy certificate & provisioning profile',
    en: '🔐  Apple Developer login required to get certificate & provisioning profile',
  },
  appleIdLabel:      { vi: 'Apple ID (email):', en: 'Apple ID (email):' },
  applePasswordLabel:{ vi: 'App-Specific Password (appleid.apple.com):', en: 'App-Specific Password (appleid.apple.com):' },
  appleRequired:     { vi: 'Bắt buộc', en: 'Required' },
  appleLoggingIn:    { vi: 'Đang đăng nhập Apple Developer...', en: 'Logging in to Apple Developer...' },
  apple2FA:          { vi: '🔐 Nhập mã 2FA từ iPhone/Mac của bạn:', en: '🔐 Enter 2FA code from your iPhone/Mac:' },
  apple2FACode:      { vi: 'Mã 6 chữ số', en: '6-digit code' },
  apple2FAVerifying: { vi: 'Đang xác thực 2FA...', en: 'Verifying 2FA...' },
  appleLoginSuccess: { vi: 'Đăng nhập thành công', en: 'Logged in successfully' },
  appleLoginFailed:  { vi: (msg) => `Đăng nhập thất bại: ${msg}`, en: (msg) => `Login failed: ${msg}` },
  appleLoadingTeam:  { vi: 'Đang lấy thông tin team...', en: 'Fetching team info...' },
  appleNoTeam:       { vi: 'Không tìm thấy Apple Developer team nào', en: 'No Apple Developer team found' },
  appleSelectTeam:   { vi: 'Chọn Apple Developer Team:', en: 'Select Apple Developer Team:' },
  appleTeamFailed:   { vi: (msg) => `Không lấy được thông tin team: ${msg}`, en: (msg) => `Failed to get team info: ${msg}` },
  appleUseCache:     { vi: (label) => `Đăng nhập tài khoản ${label}`, en: (label) => `Login as ${label}` },
  appleLoginOther:   { vi: 'Đăng nhập tài khoản khác', en: 'Login with a different account' },
  appleLoginPrompt:  { vi: 'Đăng nhập tài khoản Apple Developer', en: 'Apple Developer account' },
  appleDevicesLabel: { vi: '📱  Chọn device để build (Space = chọn/bỏ, Enter = xác nhận):', en: '📱  Select devices for build (Space = select, Enter = confirm):' },
  appleDevicesMustSelect: { vi: 'Phải chọn ít nhất 1 device.', en: 'Select at least 1 device.' },
  appleDevicesAddNew:{ vi: '＋ Thêm device mới', en: '＋ Add new device' },
  appleDevicesNone:  { vi: 'Chưa có device nào — tiến hành đăng ký device mới.', en: 'No devices yet — proceeding to register a new device.' },
  appleDeviceName:   { vi: 'Tên device (để nhận ra sau này):', en: 'Device name (to identify later):' },
  appleDeviceDefault:{ vi: 'My iPhone', en: 'My iPhone' },
  appleDeviceSaving: { vi: 'Đang lưu device...', en: 'Saving device...' },
  appleDeviceSaved:  { vi: (name) => `Đã lưu: ${name}`, en: (name) => `Saved: ${name}` },
  appleDeviceSaveFailed: { vi: (msg) => `Không lưu được device: ${msg}`, en: (msg) => `Failed to save device: ${msg}` },
  appleDeviceSyncing:{ vi: (n) => `Đang đồng bộ ${n} device(s) lên Apple Developer...`, en: (n) => `Syncing ${n} device(s) to Apple Developer...` },
  appleDeviceSynced: { vi: (n) => `Đã đồng bộ ${n} device(s) lên Apple Developer`, en: (n) => `Synced ${n} device(s) to Apple Developer` },
  appleDeviceSyncFailed: { vi: (msg) => `Lỗi khi đồng bộ devices: ${msg}`, en: (msg) => `Failed to sync devices: ${msg}` },
  enrollNewDevice:   { vi: '📱  Đăng ký device mới', en: '📱  Register new device' },
  enrollQRHint:      { vi: '   iPhone sẽ tự động gửi UDID khi quét mã QR bên dưới', en: '   iPhone will automatically send UDID when you scan the QR code below' },
  enrollQRScan:      { vi: 'Quét QR code bằng Camera app trên iPhone:', en: 'Scan QR code with Camera app on iPhone:' },
  enrollOrOpen:      { vi: 'Hoặc mở URL: ', en: 'Or open URL: ' },
  enrollWaiting:     { vi: 'Đang chờ iPhone xác nhận...', en: 'Waiting for iPhone confirmation...' },
  enrollConfirmed:   { vi: (name, udid) => `Device đã xác nhận: ${name}  (${udid})`, en: (name, udid) => `Device confirmed: ${name}  (${udid})` },
  enrollExpired:     { vi: 'Enrollment đã hết hạn (10 phút)', en: 'Enrollment expired (10 minutes)' },
  enrollPolling:     { vi: (min) => `Chờ iPhone quét QR... (còn ${min} phút)`, en: (min) => `Waiting for iPhone to scan QR... (${min} min left)` },
  enrollTimeout:     { vi: 'Hết thời gian chờ (10 phút)', en: 'Timed out (10 minutes)' },
  enrollCreateFailed:{ vi: (msg) => `Không tạo được enrollment session: ${msg}`, en: (msg) => `Failed to create enrollment session: ${msg}` },
  ascKeyCreating:    { vi: 'Đang tạo App Store Connect API Key...', en: 'Creating App Store Connect API Key...' },
  ascKeyCreated:     { vi: (id) => `ASC API Key tạo thành công: ${id}`, en: (id) => `ASC API Key created: ${id}` },
  ascKeyFailed:      { vi: (msg) => `Không lấy được ASC API Key: ${msg}`, en: (msg) => `Failed to get ASC API Key: ${msg}` },
  ascKeyNoIssuer:    { vi: '⚠  Không tự lấy được Issuer ID.', en: '⚠  Could not auto-fetch Issuer ID.' },
  ascKeyIssuerHint:  { vi: '   Tìm tại: https://appstoreconnect.apple.com/access/integrations/api', en: '   Find it at: https://appstoreconnect.apple.com/access/integrations/api' },
  ascKeyIssuerLabel: { vi: 'Issuer ID (UUID):', en: 'Issuer ID (UUID):' },
  ascKeyCached:      { vi: (id) => `✔  ASC API Key (cached): ${id}`, en: (id) => `✔  ASC API Key (cached): ${id}` },
  certLoading:       { vi: (label) => `Đang lấy ${label} Certificate...`, en: (label) => `Fetching ${label} Certificate...` },
  certReused:        { vi: (label, id) => `${label} Certificate (reused): ${id}`, en: (label, id) => `${label} Certificate (reused): ${id}` },
  certNew:           { vi: (label, id) => `${label} Certificate (new): ${id}`, en: (label, id) => `${label} Certificate (new): ${id}` },
  certFailed:        { vi: (label, msg) => `Lỗi ${label} cert: ${msg}`, en: (label, msg) => `${label} cert error: ${msg}` },
  profileLoading:    { vi: (label) => `Đang lấy ${label} Provisioning Profile...`, en: (label) => `Fetching ${label} Provisioning Profile...` },
  profileReusing:    { vi: (label) => `Reusing existing ${label} profile...`, en: (label) => `Reusing existing ${label} profile...` },
  profileCertMismatch: { vi: 'Profile không khớp cert → đang tạo lại...', en: 'Profile cert mismatch → recreating...' },
  profileCapChanged: { vi: 'Capabilities thay đổi → đang tạo lại profile...', en: 'Capabilities changed → recreating profile...' },
  profileNewCert:    { vi: 'Cert mới → đang tạo lại profile...', en: 'New cert → recreating profile...' },
  profileInvalid:    { vi: 'Profile không hợp lệ → đang tạo lại...', en: 'Invalid profile → recreating...' },
  profileOK:         { vi: (label) => `${label} Provisioning Profile OK`, en: (label) => `${label} Provisioning Profile OK` },
  profileFailed:     { vi: (label, msg) => `Lỗi ${label} profile: ${msg}`, en: (label, msg) => `${label} profile error: ${msg}` },
  profileNoContent:  { vi: 'Profile không có nội dung', en: 'Profile has no content' },
  profileNoBundleId: { vi: (id) => `App ID "${id}" không tồn tại trên Apple Developer`, en: (id) => `App ID "${id}" does not exist on Apple Developer` },
  credsCached:       { vi: (path) => `✔  Credentials đã cache tại: ${path}`, en: (path) => `✔  Credentials cached at: ${path}` },

  // ── status ──────────────────────────────────────────────────────────────────
  statusRunning: {
    vi: 'Build đang chạy — đang theo dõi...',
    en: 'Build is running — watching...',
  },

  // ── configure ───────────────────────────────────────────────────────────────
  configureProjectLabel: {
    vi: 'Project:',
    en: 'Project:',
  },
  configureProjectDefault: {
    vi: '(cwd khi chạy ant build)',
    en: '(current directory when running ant build)',
  },
  configureUsage: {
    vi: 'Dùng:',
    en: 'Use:',
  },

  // ── update-check ────────────────────────────────────────────────────────────
  updateAvailable: {
    vi: (cur, lat) => `  Có phiên bản mới: ${cur} → ${lat}`,
    en: (cur, lat) => `  Update available: ${cur} → ${lat}`,
  },
  updateRun: {
    vi: '  Chạy: npm install -g ant-go@latest để cập nhật',
    en: '  Run: npm install -g ant-go@latest to upgrade',
  },

  // ── server error codes ───────────────────────────────────────────────────────
  // Firebase auth error codes
  serverError: {
    EMAIL_NOT_FOUND:              { vi: 'Không tìm thấy tài khoản với email này.',      en: 'No account found with this email.' },
    INVALID_PASSWORD:             { vi: 'Mật khẩu không đúng.',                         en: 'Incorrect password.' },
    INVALID_EMAIL:                { vi: 'Email không hợp lệ.',                           en: 'Invalid email address.' },
    USER_DISABLED:                { vi: 'Tài khoản đã bị vô hiệu hóa.',                 en: 'This account has been disabled.' },
    TOO_MANY_ATTEMPTS_TRY_LATER:  { vi: 'Quá nhiều lần thử. Vui lòng thử lại sau.',     en: 'Too many attempts. Please try again later.' },
    INVALID_LOGIN_CREDENTIALS:    { vi: 'Email hoặc mật khẩu không đúng.',              en: 'Incorrect email or password.' },
    // Auth / token
    'Chưa đăng nhập. Chạy: ant auth login':         { vi: 'Bạn chưa đăng nhập.',                          en: 'You are not logged in.' },
    'Chưa đăng nhập. Chạy: ant-go auth login':       { vi: 'Bạn chưa đăng nhập.',                          en: 'You are not logged in.' },
    'Missing Authorization header':                   { vi: 'Thiếu Authorization header.',                  en: 'Missing Authorization header.' },
    'Token không hợp lệ hoặc đã hết hạn':            { vi: 'Token không hợp lệ hoặc đã hết hạn.',         en: 'Token is invalid or expired.' },
    'Token không hợp lệ':                            { vi: 'Token không hợp lệ.',                          en: 'Invalid token.' },
    'Token không tồn tại':                           { vi: 'Token không tồn tại.',                         en: 'Token not found.' },
    'Token đã hết hạn':                              { vi: 'Token đã hết hạn.',                            en: 'Token has expired.' },
    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.': { vi: 'Phiên đăng nhập đã hết hạn.',          en: 'Session expired. Please login again.' },
    'Không thể xác thực token':                      { vi: 'Không thể xác thực token.',                   en: 'Failed to verify token.' },
    'Không thể xác thực token mới':                  { vi: 'Không thể xác thực token mới.',               en: 'Failed to verify new token.' },
    'Email và password là bắt buộc':                 { vi: 'Email và password là bắt buộc.',               en: 'Email and password are required.' },
    'refreshToken là bắt buộc':                      { vi: 'refreshToken là bắt buộc.',                   en: 'refreshToken is required.' },
    'idToken là bắt buộc':                           { vi: 'idToken là bắt buộc.',                        en: 'idToken is required.' },
    // Build
    'Build job not found':                           { vi: 'Không tìm thấy build job.',                   en: 'Build job not found.' },
    'Build not found':                               { vi: 'Không tìm thấy build.',                       en: 'Build not found.' },
    'Build không tồn tại':                           { vi: 'Build không tồn tại.',                        en: 'Build not found.' },
    'Build ID is required':                          { vi: 'Thiếu Build ID.',                              en: 'Build ID is required.' },
    'Build chưa có IPA':                             { vi: 'Build chưa có IPA.',                          en: 'Build has no IPA yet.' },
    'Build has no userId':                           { vi: 'Build không có userId.',                      en: 'Build has no userId.' },
    'Chỉ có thể submit build đã thành công':         { vi: 'Chỉ có thể submit build đã thành công.',     en: 'Only successful builds can be submitted.' },
    'Không thể khởi động upload job':                { vi: 'Không thể khởi động upload job.',             en: 'Failed to start upload job.' },
    'buildId là bắt buộc':                           { vi: 'buildId là bắt buộc.',                       en: 'buildId is required.' },
    'ids is required':                               { vi: 'Thiếu danh sách ids.',                        en: 'ids is required.' },
    'Log file not available for this build':         { vi: 'Log chưa có cho build này.',                  en: 'Log file not available for this build.' },
    // Credits / plan
    'Hết credit. Nâng cấp plan hoặc chờ reset đầu tháng tại antgo.work/account/billing': {
      vi: 'Hết credit. Nâng cấp plan tại antgo.work/account/billing.',
      en: 'Out of credits. Upgrade your plan at antgo.work/account/billing.',
    },
    'Invalid plan':                                  { vi: 'Plan không hợp lệ.',                         en: 'Invalid plan.' },
    // App
    'App not found or forbidden':                    { vi: 'Không tìm thấy app hoặc không có quyền truy cập.', en: 'App not found or access denied.' },
    'App not found':                                 { vi: 'Không tìm thấy app.',                        en: 'App not found.' },
    'name là bắt buộc':                              { vi: 'Tên app là bắt buộc.',                       en: 'App name is required.' },
    'projectId là bắt buộc':                         { vi: 'projectId là bắt buộc.',                     en: 'projectId is required.' },
    // Device
    'udid là bắt buộc':                              { vi: 'udid là bắt buộc.',                          en: 'udid is required.' },
    // ASC key
    'keyId, issuerId và privateKeyP8 là bắt buộc':  { vi: 'keyId, issuerId và privateKeyP8 là bắt buộc.', en: 'keyId, issuerId and privateKeyP8 are required.' },
    'teamId, keyId, issuerId và privateKeyP8 là bắt buộc': { vi: 'teamId, keyId, issuerId và privateKeyP8 là bắt buộc.', en: 'teamId, keyId, issuerId and privateKeyP8 are required.' },
    'privateKeyP8 không hợp lệ — phải là nội dung file .p8': { vi: 'privateKeyP8 không hợp lệ — phải là nội dung file .p8.', en: 'privateKeyP8 is invalid — must be the contents of a .p8 file.' },
    'missing_asc_key':                               { vi: 'Thiếu App Store Connect API Key.',            en: 'Missing App Store Connect API Key.' },
    // General
    'Unauthorized':                                  { vi: 'Không có quyền truy cập.',                   en: 'Unauthorized.' },
    'Forbidden':                                     { vi: 'Bị từ chối truy cập.',                       en: 'Access forbidden.' },
    'Không tìm thấy':                                { vi: 'Không tìm thấy.',                            en: 'Not found.' },
    'Invalid JSON body':                             { vi: 'Body JSON không hợp lệ.',                    en: 'Invalid JSON body.' },
    'Invalid signature':                             { vi: 'Chữ ký không hợp lệ.',                       en: 'Invalid signature.' },
    'Missing signature':                             { vi: 'Thiếu chữ ký.',                              en: 'Missing signature.' },
    'Server misconfigured':                          { vi: 'Lỗi cấu hình server.',                       en: 'Server misconfigured.' },
    'No billing account found':                      { vi: 'Không tìm thấy tài khoản thanh toán.',       en: 'No billing account found.' },
    'durationMs phải là số dương':                   { vi: 'durationMs phải là số dương.',               en: 'durationMs must be a positive number.' },
    'repoFullName phải có định dạng owner/repo':     { vi: 'repoFullName phải có định dạng owner/repo.', en: 'repoFullName must be in the format owner/repo.' },
    'antgoAppId and repoFullName are required':      { vi: 'Thiếu antgoAppId hoặc repoFullName.',        en: 'antgoAppId and repoFullName are required.' },
    'GITHUB_APP_SLUG chưa được cấu hình':            { vi: 'GITHUB_APP_SLUG chưa được cấu hình.',        en: 'GITHUB_APP_SLUG is not configured.' },
  },
  loginFailedDefault: {
    vi: 'Đăng nhập thất bại. Kiểm tra lại email và mật khẩu.',
    en: 'Login failed. Please check your email and password.',
  },
  langSet: {
    vi: (lang) => `✓ Ngôn ngữ đã đổi sang: ${lang === 'vi' ? 'Tiếng Việt' : 'English'}`,
    en: (lang) => `✓ Language set to: ${lang === 'vi' ? 'Tiếng Việt' : 'English'}`,
  },
  langInvalid: {
    vi: 'Ngôn ngữ không hợp lệ. Dùng: ant set lang vi  hoặc  ant set lang en',
    en: 'Invalid language. Use: ant set lang vi  or  ant set lang en',
  },

  // ── first run ───────────────────────────────────────────────────────────────
  firstRunWelcome: {
    vi: '👋  Chào mừng bạn đến với ant-go CLI!',
    en: '👋  Welcome to ant-go CLI!',
  },
  firstRunGetStarted: {
    vi: 'Bắt đầu bằng cách đăng nhập:',
    en: 'Get started by logging in:',
  },
  firstRunDocs: {
    vi: 'Tài liệu đầy đủ tại:',
    en: 'Full documentation at:',
  },
  firstRunLangHint: {
    vi: '💡  Prefer English? Run: ant set lang en',
    en: '💡  Muốn dùng CLI bằng tiếng Việt? Chạy: ant set lang vi',
  },
};

function getLang() {
  try {
    const cfg = loadConfig();
    return cfg.lang === 'vi' ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

function t(key, ...args) {
  const lang = getLang();
  const entry = MESSAGES[key];
  if (!entry) return key;
  const val = entry[lang] ?? entry['vi'];
  return typeof val === 'function' ? val(...args) : val;
}

// Translate server error message — supports Firebase error codes and Vietnamese strings
function tError(serverMessage) {
  if (!serverMessage) return serverMessage;
  const lang = getLang();
  const errors = MESSAGES.serverError;

  // 1. Direct key match (Firebase error codes or exact Vietnamese strings)
  if (errors[serverMessage]) {
    return errors[serverMessage][lang] ?? errors[serverMessage]['vi'];
  }

  // 2. Firebase error code embedded in message (e.g. "INVALID_LOGIN_CREDENTIALS : ...")
  for (const [code, translations] of Object.entries(errors)) {
    if (serverMessage.includes(code)) {
      return translations[lang] ?? translations['vi'];
    }
  }

  // 3. No match — return raw server message as-is
  return serverMessage;
}

module.exports = { t, tError, getLang, MESSAGES };

