# Tasks

Danh sách task và quy tắc làm việc cho Claude.

---

## Danh sách task

| File | Mô tả | Status | PR |
|---|---|---|---|
| [fix-add-device-flow.md](fix-add-device-flow.md) | Sửa lại flow add device CLI + Dashboard | `done` | [#1](https://github.com/kingasawa/ant-go/pull/1) |

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

### 6. Tạo PR khi hoàn thành

1. Push branch lên remote.
2. Tạo PR từ `feature/<tên-task>` vào `main`.
3. Ghi URL PR vào dòng `**PR:**` trong file task.
4. Cập nhật status thành `done` ở cả 2 nơi (README + file task).

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
