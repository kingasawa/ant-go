# Docs Index — ant-go

Before reading any source file to understand a flow or feature, check here first.
If the topic is already documented, use that doc directly.

---

## Available docs

| File | Topic | What it covers |
|---|---|---|
| [build-flow.md](./build-flow.md) | iOS/Android build flow | Full flow from `ant build` CLI command → Apple credentials → capability sync → GCS upload → Mac build server → dashboard realtime display. Includes auto-submit, credit deduction, Firestore data model. |
| [add-device-feature.md](./add-device-feature.md) | Device enrollment | QR code → `.mobileconfig` signing → UDID capture flow. Firestore `device_enrollments`, `users/{uid}/devices`. CMS/PKCS#7 signing with `node-forge`. |
| [device-enrollment-flow.md](./device-enrollment-flow.md) | Device enrollment (short) | Concise version of the UDID enrollment steps from the iOS device perspective. |
| [apple-utils-asc-key.md](./apple-utils-asc-key.md) | ASC API Key management | How `@expo/apple-utils` creates and downloads ASC API keys programmatically via Apple Developer Portal session. `ApiKey` class, `ensureAscKey` pattern, issuer ID retrieval. |
| [ant-json-config.md](./ant-json-config.md) | `ant.json` build profiles | Build profile config (`distribution`, `developmentClient`). CLI reads this to determine store vs internal distribution. |
| [cli-token-lifecycle.md](./cli-token-lifecycle.md) | CLI token auth | Full lifecycle of CLI tokens in Firestore `cli_tokens`: creation, usage, renewal, revocation, cleanup. |
| [credit-system.md](./credit-system.md) | Credit system | Credit deduction logic per build outcome (`success → -1`, `failed_fast → -0.2`, `failed_slow → -0.4`). Firestore transaction, `creditHistory`, plan limits. |
| [stripe-payment-flow.md](./stripe-payment-flow.md) | Stripe payments | Checkout flow → webhook → Firestore plan update → billing page. |
| [github-app-setup.md](./github-app-setup.md) | GitHub App integration | Creating and configuring the GitHub App for auto-triggering builds on push/PR. |
| [submit-testflight-feature.md](./submit-testflight-feature.md) | TestFlight submission | Submitting IPA to TestFlight from the dashboard. ASC key lookup, submission job, Cloud Build runner. |

---

## How to use this index

- **Looking for a flow?** Scan the table above first.
- **Not found?** Read the codebase, then add a new row here and create a doc in this folder.
- **Changed code?** Update the relevant doc and this index if the description is now outdated.
