# Claude Instructions — ant-go

## Làm task từ /tasks

Khi được yêu cầu làm task (ví dụ: "làm task fix-add-device-flow"):

1. Đọc `tasks/README.md` để xem danh sách và status.
2. Đọc file task tương ứng trong `tasks/`.
3. Làm theo đúng quy tắc dưới đây.

### Quy tắc bắt buộc

**Status:** Cập nhật status trong `tasks/README.md` thành `in_progress` khi bắt đầu, `done` khi xong.

**Tiến độ:** Đánh dấu `[x]` trong file task ngay sau khi hoàn thành từng subtask. Không chờ đến cuối. Nếu bị ngắt giữa chừng, file task phản ánh đúng đã làm đến đâu.

**Kiểm tra trước khi làm:** Đọc các file liên quan để hiểu luồng hiện tại. Nếu phát hiện thay đổi có thể ảnh hưởng lớn (schema Firestore, API đang dùng, auth logic) → liệt kê rõ và chờ xác nhận trước khi tiếp tục.

**Tài liệu `/docs`:** Đọc tài liệu liên quan trước khi làm. Không làm sai flow đã mô tả. Nếu thay đổi code ảnh hưởng đến tài liệu → báo trước, chờ xác nhận, sau đó cập nhật file `.md` tương ứng.
