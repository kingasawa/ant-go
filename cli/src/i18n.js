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
    vi: 'Thiếu --platform. Dùng: --platform ios hoặc --platform android',
    en: 'Missing --platform. Use: --platform ios or --platform android',
  },
  buildUsage: {
    vi: 'Cách dùng:',
    en: 'Usage:',
  },
  buildExample: {
    vi: '$ ant build --platform ios',
    en: '$ ant build --platform ios',
  },

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
  serverError: {
    EMAIL_NOT_FOUND: {
      vi: 'Không tìm thấy tài khoản với email này.',
      en: 'No account found with this email.',
    },
    INVALID_PASSWORD: {
      vi: 'Mật khẩu không đúng.',
      en: 'Incorrect password.',
    },
    INVALID_EMAIL: {
      vi: 'Email không hợp lệ.',
      en: 'Invalid email address.',
    },
    USER_DISABLED: {
      vi: 'Tài khoản đã bị vô hiệu hóa.',
      en: 'This account has been disabled.',
    },
    TOO_MANY_ATTEMPTS_TRY_LATER: {
      vi: 'Quá nhiều lần thử. Vui lòng thử lại sau.',
      en: 'Too many attempts. Please try again later.',
    },
    INVALID_LOGIN_CREDENTIALS: {
      vi: 'Email hoặc mật khẩu không đúng.',
      en: 'Incorrect email or password.',
    },
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
    return cfg.lang === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

function t(key, ...args) {
  const lang = getLang();
  const entry = MESSAGES[key];
  if (!entry) return key;
  const val = entry[lang] ?? entry['vi'];
  return typeof val === 'function' ? val(...args) : val;
}

// Translate server error — match by code embedded in message or use raw message
function tError(serverMessage) {
  const lang = getLang();
  const errors = MESSAGES.serverError;
  // Try to find a matching error code in the server message
  for (const [code, translations] of Object.entries(errors)) {
    if (serverMessage?.includes(code) || serverMessage === translations['vi'] || serverMessage === translations['en']) {
      return translations[lang] ?? translations['vi'];
    }
  }
  // Vietnamese messages from server — translate known ones
  const viMessages = Object.values(errors).map(e => e['vi']);
  const idx = viMessages.indexOf(serverMessage);
  if (idx !== -1) {
    const code = Object.keys(errors)[idx];
    return errors[code][lang] ?? serverMessage;
  }
  return serverMessage;
}

module.exports = { t, tError, getLang, MESSAGES };

