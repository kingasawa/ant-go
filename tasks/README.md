# Tasks

Danh sách task và quy tắc làm việc cho Claude.

---

## Danh sách task

| File | Mô tả | Status |
|---|---|---|
| [fix-add-device-flow.md](fix-add-device-flow.md) | Sửa lại flow add device CLI + Dashboard | `pending` |

**Status hợp lệ:** `pending` · `in_progress` · `done` · `blocked`

---

## Quy tắc làm task

### 1. Cập nhật status

- Khi **bắt đầu** làm một task → sửa status thành `in_progress` trong README này.
- Khi **hoàn thành** task → sửa status thành `done`.
- Không được bắt đầu task đã có status `done` — nếu cần làm lại thì hỏi trước.

---

### 2. Đánh dấu tiến độ trong file task

Mỗi subtask trong file `.md` phải được cập nhật trạng thái khi làm xong:

```
- [ ] TASK-01  →  chưa làm
- [x] TASK-01  →  đã làm xong
- [~] TASK-01  →  đang làm / làm dở
```

Cập nhật **ngay sau khi** hoàn thành từng subtask, không chờ đến cuối.  
Nếu bị ngắt giữa chừng, file task phản ánh đúng đã làm đến đâu.

---

### 3. Kiểm tra trước khi làm

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

### 4. Tôn trọng tài liệu trong `/docs`

- **Trước khi làm:** đọc file tài liệu liên quan trong `/docs` (và `cli/docs`) để hiểu flow đã được ghi lại.
- **Không được làm sai** so với tài liệu hiện có mà không có lý do.
- Nếu việc sửa code sẽ **thay đổi flow đã mô tả trong tài liệu** → báo cho tôi biết phần nào bị ảnh hưởng và chờ xác nhận.
- **Sau khi hoàn thành subtask** có ảnh hưởng đến tài liệu → cập nhật file `.md` tương ứng trong `/docs`.

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
4. Cập nhật status README + đánh dấu tiến độ trong file task
