# ant-go CLI

CLI tool để trigger iOS/Android builds thông qua Firebase build server — cùng logic với `build-scripts/trigger-build.js` nhưng được tổ chức lại thành một CLI có thể tái sử dụng.

## Cấu trúc

```
cli/
├── bin/
│   └── ant-go.js          # Entry point (CLI)
├── src/
│   ├── commands/
│   │   ├── build.js        # `ant build`
│   │   └── status.js       # `ant status <jobId>`
│   ├── apple/
│   │   ├── auth.js         # Apple login
│   │   ├── certificate.js  # Distribution cert (p12 cache)
│   │   └── profile.js      # App Store provisioning profile
│   ├── config.js           # Load & validate config từ .env
│   ├── firebase.js         # Firebase Admin singleton
│   ├── logger.js           # Timestamped logger
│   └── prompt.js           # readline / raw-mode helpers
├── .env.example
├── .gitignore
└── package.json
```

## Setup

```bash
cd cli
npm install
cp .env.example .env
# Điền thông tin vào .env
```

Đặt file `firebase-credentials.json` vào thư mục `cli/` (hoặc set `FIREBASE_CREDENTIALS_PATH` trong `.env`).

## Sử dụng

### Trigger build

```bash
node bin/ant-go.js build
# hoặc sau npm link:
ant build
```

Options:
- `-e, --env <path>`   — đường dẫn tới `.env` (mặc định: `.env`)
- `-c, --creds <path>` — đường dẫn tới Firebase credentials JSON
- `--no-watch`         — không watch progress sau khi submit

### Xem status

```bash
ant status <jobId>
```

## Workflow (giống trigger-build.js)

1. Đọc Apple credentials từ `.env` hoặc prompt tương tác
2. Login Apple Developer Portal (session cached — không cần 2FA lần sau)
3. Reuse hoặc tạo mới Distribution Certificate (p12 cached ở `.cert-cache.json`)
4. Reuse hoặc recreate App Store Provisioning Profile
5. Pack project → upload lên Firebase Storage
6. Tạo Firestore build job
7. Watch trạng thái build realtime

## Global install

```bash
cd cli
npm install
npm link   # → `ant` available globally
```
