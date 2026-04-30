# Claude Instructions — ant-go

## Làm task từ /tasks

Khi được yêu cầu làm task (ví dụ: "làm task fix-add-device-flow"):

1. Đọc `tasks/README.md` để xem danh sách và status.
2. Đọc file task tương ứng trong `tasks/`.
3. Làm theo đúng quy tắc dưới đây.

### Quy tắc bắt buộc

**Branch:** Trước khi tạo feature branch, phải đảm bảo `main` đã có code mới nhất:
```
git checkout main
git pull origin main
git checkout -b feature/<tên-task>
```
Toàn bộ code của task được commit lên branch này.

**Status:** Cập nhật status **đồng thời** ở 2 nơi mỗi khi thay đổi:
- `tasks/README.md` — cột Status trong bảng danh sách
- File task tương ứng — dòng `**Status:**` ở đầu file

Các mốc cập nhật: `in_progress` khi bắt đầu, `done` khi hoàn thành.

**Tiến độ:** Đánh dấu `[x]` trong file task ngay sau khi hoàn thành từng subtask. Không chờ đến cuối. Nếu bị ngắt giữa chừng, file task phản ánh đúng đã làm đến đâu.

**PR:** Khi task hoàn thành:
1. Push branch `feature/<tên-task>` lên remote.
2. Tạo PR từ branch đó vào `main`.
3. Ghi URL của PR vào dòng `**PR:**` trong file task.
4. Cập nhật status thành `done` ở cả 2 nơi (README + file task).

**Kiểm tra trước khi làm:** Đọc các file liên quan để hiểu luồng hiện tại. Nếu phát hiện thay đổi có thể ảnh hưởng lớn (schema Firestore, API đang dùng, auth logic) → liệt kê rõ và chờ xác nhận trước khi tiếp tục.

**Tài liệu `/docs`:** Đọc tài liệu liên quan trước khi làm. Không làm sai flow đã mô tả. Nếu thay đổi code ảnh hưởng đến tài liệu → báo trước, chờ xác nhận, sau đó cập nhật file `.md` tương ứng.
