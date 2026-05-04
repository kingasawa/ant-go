# ant-go CLI

Build iOS and Android apps with a single command — no complex CI/CD setup required.

## Installation

```bash
npm install -g ant-go
```

## Getting Started

### 1. Login

```bash
# Login with email/password
ant auth login

# Or login with Google via browser
ant auth login --browser
```

### 2. Add `projectId` to `app.json`

Get your Project ID from [antgo.work](https://antgo.work) after creating a project.

```json
{
  "expo": {
    "extra": {
      "ant": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

> The CLI automatically detects `bundleId`, `schemeName`, and `xcworkspace` from your project files. No extra configuration needed.

### 3. Build

```bash
ant build --platform ios
```

---

## Commands

### `ant build`

Packages your project, uploads it to the build server, and tracks progress.

```bash
ant build --platform ios
ant build --platform ios --profile development
ant build --platform ios --auto-submit        # auto-submit to TestFlight after build
ant build --platform ios --reauth             # re-login to Apple Developer, clear cache
ant build --platform ios --refresh-profile    # recreate Provisioning Profile
```

| Option | Description |
|---|---|
| `--platform <platform>` | `ios` or `android` |
| `--profile <profile>` | Build profile from `ant.json` (default: `production`) |
| `--project <path>` | Path to project directory (default: current directory) |
| `--reauth` | Clear Apple Developer session cache and re-login |
| `--refresh-profile` | Recreate Provisioning Profile (use when Capabilities change) |
| `--auto-submit` | Automatically submit IPA to TestFlight after a successful build |

---

### `ant status <jobId>`

Check the status of a build job.

```bash
ant status abc123xyz
```

```
  Job ID:   abc123xyz
  Status:   SUCCESS
  Created:  4/27/2026, 10:30:00 AM
  Updated:  4/27/2026, 10:45:12 AM
  IPA:      https://storage.googleapis.com/.../MyApp.ipa
```

---

### `ant auth login`

Login to your antgo.work account. Token is stored at `~/.ant-go/config.json` and valid for 24 hours.

```bash
ant auth login
ant auth login --browser   # Google OAuth
```

### `ant auth logout`

Logout and revoke the current token.

```bash
ant auth logout
```

### `ant auth whoami`

Display information about the currently logged-in account.

```bash
ant auth whoami
```

```
  Name:    John Doe
  Email:   dev@example.com
  Plan:    Pro
  Credits: 12 / 15
  Expires: 2026-05-01 10:30:00
```

---

## Build Profiles (`ant.json`)

Place `ant.json` at the root of your project (next to `app.json`). If it doesn't exist, the CLI will create it with default profiles on first run.

```json
{
  "build": {
    "production": {
      "distribution": "store"
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    }
  }
}
```

| Profile | `distribution` | Use when |
|---|---|---|
| `production` | `store` | Releasing to App Store or distributing via TestFlight |
| `development` | `internal` | Debugging on a real device, connecting to Metro bundler |
| `preview` | `internal` | Sharing internal test builds before going to the store |

> **`distribution: internal`** requires registering device UDIDs beforehand. The CLI guides you through this automatically via QR code.

---

## Add Device (iOS internal build)

When building with `distribution: internal`, the CLI will ask which devices to include. To register a new device:

1. CLI displays a **QR code** in the terminal.
2. Scan the QR code with the **Camera app** on your iPhone (no separate app needed).
3. iPhone downloads `.mobileconfig` → automatically sends UDID to the server.
4. CLI receives the UDID, registers it on **Apple Developer Portal**, and creates a new Provisioning Profile.

```bash
ant build --platform ios --profile development
```

---

## Auto Submit to TestFlight

Add `--auto-submit` to automatically upload your IPA to TestFlight after a successful build (only works with `distribution: store`).

```bash
ant build --platform ios --auto-submit
```

The CLI will automatically:
1. Generate and cache an **App Store Connect API Key** from your Apple Developer Portal session.
2. Upload the key to the server for use during submission.
3. After the build completes, the server triggers a TestFlight submission job.

---

## How It Works

```
ant build --platform ios
    │
    ├── Read app.json + ant.json
    ├── Login to Apple Developer (cached 24h)
    ├── Create/reuse Distribution Certificate (.p12)
    ├── Create/reuse Provisioning Profile
    ├── POST /api/builds → receive jobId + signed upload URLs
    ├── Upload project.tar.gz → GCS
    ├── Upload credentials.json → GCS
    ├── POST /api/builds/:id/start
    │
    └── Track at: https://antgo.work/account/app/MyApp/builds/abc123xyz

Mac Build Server (automatic):
    ├── Download + extract project
    ├── npm install + Fastlane + Xcode build
    ├── Upload IPA → GCS
    └── Update status + deduct credit → realtime dashboard
```

---

## Credential Caching

The CLI caches Apple credentials at `~/.ant-go/creds-<profileName>.json` (TTL: 24h):

- Apple Developer session
- Distribution Certificate (`.p12`)
- Provisioning Profile
- App Store Connect API Key (no expiry)

Use `--reauth` to clear the cache and re-login from scratch.

---

## Full Documentation

👉 **[antgo.work/docs](https://antgo.work/docs)**
