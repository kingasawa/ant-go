# Tasks

Danh sách task và quy tắc làm việc cho Claude.

---

## Danh sách task

| File | Mô tả | Status | PR |
|---|---|---|---|
| [fix-add-device-flow.md](fix-add-device-flow.md) | Sửa lại flow add device CLI + Dashboard | `done` | [#1](https://github.com/kingasawa/ant-go/pull/1) |
| [submit-ipa-testflight.md](submit-ipa-testflight.md) | Submit IPA lên TestFlight từ dashboard | `done` | [#2](https://github.com/kingasawa/ant-go/pull/2) |
| [cli-auto-collect-asc-key.md](cli-auto-collect-asc-key.md) | CLI tự động thu thập ASC API Key khi build (store), lưu vào dashboard per-user | `done` | [#PR](https://github.com/kingasawa/ant-go/pull/new/feature/cli-auto-collect-asc-key) |
| [credit-system.md](credit-system.md) | Hệ thống credit quản lý lượt build — FREE 15 credit/tháng, giới hạn 3 app, trang Usage | `done` | [#PR](https://github.com/kingasawa/ant-go/pull/new/feature/credit-system) |

**Status hợp lệ:** `pending` · `in_progress` · `done` · `blocked`

---

## Quy tắc bắt buộc khi làm task

### 1. Branch

Trước khi bắt đầu, đảm bảo `main` đã có code mới nhất rồi tạo feature branch:

```
git checkout main
git pull origin main
git checkout -b feature/<tên-task>
```

Toàn bộ code của task được commit lên branch này.

---

### 2. Cập nhật status

Status phải được cập nhật **đồng thời ở 2 nơi** mỗi khi thay đổi:
- File `tasks/README.md` — cột Status trong bảng danh sách
- File task tương ứng — dòng `**Status:**` ở đầu file

Các mốc cập nhật:
- `in_progress` — khi bắt đầu làm
- `done` — khi hoàn thành và đã tạo PR

Không được bắt đầu task đã có status `done` — nếu cần làm lại thì hỏi trước.

---

### 3. Đánh dấu tiến độ trong file task

Mỗi subtask trong file `.md` phải được cập nhật trạng thái ngay khi làm xong:

```
- [ ] TASK-01  →  chưa làm
- [~] TASK-01  →  đang làm / làm dở
- [x] TASK-01  →  đã làm xong
```

Cập nhật **ngay sau khi** hoàn thành từng subtask, không chờ đến cuối.
Nếu bị ngắt giữa chừng, file task phản ánh đúng đã làm đến đâu.

---

### 4. Kiểm tra trước khi làm

Trước khi bắt đầu bất kỳ subtask nào:

1. Đọc các file liên quan để hiểu luồng hiện tại.
2. Nếu phát hiện phần nào **có thể ảnh hưởng lớn** đến tính năng đang hoạt động → liệt kê rõ và **chờ xác nhận** trước khi tiếp tục.
3. Không tự ý sửa ngoài phạm vi subtask đang làm.
4. **Nếu task có biến môi trường mới** → đọc `cloudbuild.appengine.yaml` ngay lập tức, đối chiếu từng biến, và làm đủ checklist Rule 6b **trong cùng subtask** — không để sang bước sau.

Ví dụ những trường hợp phải hỏi trước:
- Thay đổi schema Firestore đang có data thật
- Sửa API endpoint mà CLI đang dùng
- Thay đổi logic auth / token
- Xoá hoặc rename field trong response API

---

### 5. Tôn trọng tài liệu trong `/docs`

- **Trước khi làm:** đọc file tài liệu liên quan trong `/docs` (và `cli/docs`) để hiểu flow đã được ghi lại.
- **Không được làm sai** so với tài liệu hiện có mà không có lý do.
- Nếu việc sửa code sẽ **thay đổi flow đã mô tả trong tài liệu** → báo cho tôi biết phần nào bị ảnh hưởng và chờ xác nhận.
- **Sau khi hoàn thành subtask** có ảnh hưởng đến tài liệu → cập nhật file `.md` tương ứng trong `/docs`.

---

### 5a. Liệt kê tài liệu cần sửa khi tạo task

**Bắt buộc** khi tạo file task mới: liệt kê rõ tất cả tài liệu sẽ bị ảnh hưởng trong section riêng **"Tài liệu cần cập nhật"**, bao gồm:

- Các file `.md` trong `/docs` mô tả flow liên quan
- **`app/docs/page.tsx`** — trang docs công khai (nếu tính năng thay đổi hành vi của CLI hoặc Dashboard hiển thị với user)
- Các file trong `cli/docs/` nếu liên quan đến CLI

**Bắt buộc** khi tạo file task mới: nếu task thêm biến môi trường, phải có section **"Biến môi trường"** với checkbox subtask rõ ràng:

```markdown
## Biến môi trường cần thêm

| Biến | Loại | Dùng ở | Ghi chú |
|---|---|---|---|
| `FOO_SECRET` | secret | Dashboard | Bảo vệ endpoint X |

### Checklist deploy (bắt buộc hoàn thành trước khi đóng task)

- [ ] Tạo secret `FOO_SECRET` trong Secret Manager
- [ ] Grant secretAccessor cho cloudbuild SA + appspot SA
- [ ] Thêm vào `cloudbuild.appengine.yaml` — đủ 3 chỗ (secretEnv, heredoc, availableSecrets)
- [ ] Thêm vào `env.yaml` local
```

> Checklist này là **subtask thật**, không phải ghi chú. Phải đánh dấu `[x]` từng dòng khi làm xong, không được mark subtask env var là `done` nếu checklist này chưa xong.

Ví dụ format trong file task:

```markdown
## Tài liệu cần cập nhật sau khi hoàn thành

- [ ] `docs/build-flow.md` — cập nhật bước 2 (ASC key collection) và bước 3 (appName response)
- [ ] `docs/submit-testflight-feature.md` — cập nhật Firestore schema và Cloud Build step
- [ ] `app/docs/page.tsx` — thêm bước ASC key vào terminal demo, di chuyển note --auto-submit
```

---

### 5b. Đảm bảo tài liệu đã được sửa trước khi đóng task

Trước khi chuyển status sang `done`, bắt buộc:

1. **Review lại toàn bộ danh sách "Tài liệu cần cập nhật"** trong file task.
2. **Đánh dấu `[x]`** từng mục khi đã sửa xong.
3. **`app/docs/page.tsx` phải được kiểm tra** — xem terminal demo, options list, và các mô tả có còn khớp với hành vi thực tế của code mới không.
4. Nếu phát hiện tài liệu nào bị sai so với code mới (dù không nằm trong danh sách) → sửa luôn và ghi chú vào Issue Log nếu cần.

---

### 6. Kiểm tra type và build trước khi push lên GCP

**Bắt buộc** chạy cả hai lệnh sau trước khi commit:

```bash
npx tsc --noEmit   # bắt lỗi TypeScript
next build         # bắt lỗi routing, export, bundle — tsc không thấy được
```

Chỉ được push và trigger Cloud Build khi **cả hai** không có lỗi.

> `tsc --noEmit` không đủ — lỗi Next.js routing conflict (`different slug names`), invalid route exports, hay bundle errors sẽ không bị bắt bởi TypeScript. Chỉ `next build` mới phát hiện được.

**Trước khi tạo route mới trong `app/api/`**, bắt buộc kiểm tra:
```bash
ls app/api/<parent-folder>/
```
Nếu folder cha đã có dynamic segment `[xxx]`, phải đặt route mới vào đúng `[xxx]` đó — không được tạo `[yyy]` mới cùng cấp.

Các trường hợp đặc biệt khác cần kiểm tra:
- Thêm `export` mới vào file trong `app/api/` — Next.js chỉ cho phép export `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS` và các config field (`dynamic`, `revalidate`...). Mọi named export khác sẽ khiến build fail.
- Thêm package mới — kiểm tra package có hỗ trợ Next.js/Edge runtime không.
- Sửa file liên quan đến Firestore Admin SDK — đảm bảo không import client-side SDK trong server route.

---

### 6b. Biến môi trường mới — checklist bắt buộc

**Bất cứ khi nào task thêm biến môi trường mới** (dù là secret hay plain value), phải hoàn thành **toàn bộ** checklist sau trước khi đóng task:

#### Nếu là **secret** (API key, password, token, ...):

```
[ ] 1. Tạo secret trong GCP Secret Manager:
        gcloud secrets create <TÊN> --project=<PROJECT> --data-file=-

[ ] 2. Grant secretAccessor cho CẢ HAI service account:
        - {projectNumber}@cloudbuild.gserviceaccount.com
        - {project}@appspot.gserviceaccount.com

[ ] 3. Thêm vào cloudbuild.appengine.yaml — ĐỦ 3 CHỖ:
        a) secretEnv: (trong step generate env.yaml)
        b) env.yaml heredoc: KEY: '$$KEY'
        c) availableSecrets.secretManager: versionName + env

[ ] 4. Thêm vào env.yaml local (để dev + deploy thủ công):
        KEY: "value"
```

#### Nếu là **plain value** (public config, feature flag, ...):

```
[ ] 1. Thêm vào cloudbuild.appengine.yaml — 2 CHỖ:
        a) substitutions: _KEY: "value"
        b) env.yaml heredoc: KEY: "${_KEY}"

[ ] 2. Thêm vào env.yaml local.
```

> **Lý do phải đủ 3 chỗ với secret:** `secretEnv` khai báo secret được inject vào step, `availableSecrets` link tới Secret Manager, env.yaml heredoc ghi giá trị vào file để App Engine đọc. Thiếu bất kỳ chỗ nào → Cloud Build fail hoặc App Engine không có biến.

---

### 7. Tạo PR khi hoàn thành

1. Push branch lên remote.
2. Tạo PR từ `feature/<tên-task>` vào `main`.
3. Ghi URL PR vào dòng `**PR:**` trong file task.
4. Cập nhật status thành `done` ở cả 2 nơi (README + file task).

---

### 8. Issue log — ghi lại lỗi đã gặp

Mỗi khi có lỗi **build thất bại hoặc lỗi production**, phải ghi vào bảng bên dưới để tránh lặp lại ở các task sau.

---

## Issue Log

| # | Task | Lỗi | Nguyên nhân | Cách khắc phục |
|---|---|---|---|---|
| 1 | submit-ipa-testflight | `"getAscKeyForUser" is not a valid Route export field` — Next.js build fail | Export function nội bộ (`getAscKeyForUser`) trực tiếp từ file route (`app/api/.../route.ts`). Next.js chỉ cho phép export HTTP methods từ route file. | Chuyển function ra file riêng trong `lib/` (`lib/asc-key.ts`) và import từ đó. **Quy tắc:** function nội bộ không được export từ route file. |
| 2 | submit-ipa-testflight | Cloud Build fail: `Permission 'secretmanager.versions.access' denied` trên secret `ASC_ENCRYPTION_KEY` | Secret mới tạo trong Secret Manager không có IAM binding — Cloud Build service account không có quyền đọc. | Grant `roles/secretmanager.secretAccessor` cho `{projectNumber}@cloudbuild.gserviceaccount.com` VÀ `{project}@appspot.gserviceaccount.com`. **Quy tắc:** mỗi khi tạo secret mới trong Secret Manager, phải grant quyền cho cả 2 SA này ngay. |
| 3 | submit-ipa-testflight | Site 500: `You cannot use different slug names for the same dynamic path ('appName' !== 'id')` — crash toàn bộ app | Tạo `app/api/apps/[appName]/` trong khi đã có `app/api/apps/[id]/`. Next.js không cho phép hai dynamic segment khác tên ở cùng cấp. | Đặt tất cả route con vào cùng một tên segment. **Quy tắc:** trước khi tạo route mới trong `app/api/`, kiểm tra xem folder cha đã có dynamic segment `[xxx]` nào chưa — phải dùng đúng tên đó. |
| 4 | credit-system | `INTERNAL_BUILD_SECRET` và `CRON_SECRET` thiếu trong `cloudbuild.appengine.yaml` — Cloud Build deploy xong nhưng App Engine không có 2 biến này | Task tạo secret mới nhưng không cập nhật `cloudbuild.appengine.yaml` (thiếu cả 3 chỗ: `secretEnv`, heredoc, `availableSecrets`) và không tạo secret trong Secret Manager | Bổ sung **Rule 6b** — checklist bắt buộc mỗi khi task thêm biến môi trường mới. Mọi secret phải: tạo trong Secret Manager → grant IAM → thêm đủ 3 chỗ trong `cloudbuild.appengine.yaml` → thêm vào `env.yaml` local. |

---

## Cách yêu cầu làm task

```
"làm task fix-add-device-flow"
"làm task fix-add-device-flow, bắt đầu từ TASK-03"
"tiếp tục task fix-add-device-flow"
```

Claude sẽ:
1. Đọc file task tương ứng
2. Kiểm tra subtask nào `[x]` (đã xong), `[~]` (đang dở), `[ ]` (chưa làm)
3. Bắt đầu từ subtask chưa làm hoặc đang dở
4. Cập nhật status + đánh dấu tiến độ trong file task
