# Claude Instructions — ant-go

## Làm task từ /tasks

Khi được yêu cầu làm task (ví dụ: "làm task fix-add-device-flow"):

1. Đọc `tasks/README.md` — xem danh sách, status, và **toàn bộ quy tắc bắt buộc**.
2. Đọc file task tương ứng trong `tasks/`.
3. Làm theo đúng quy tắc trong `tasks/README.md`.

---

## Quy tắc bắt buộc với Apple Developer / App Store Connect

> **TRƯỚC KHI** kết luận rằng một thao tác Apple Developer hoặc App Store Connect "không thể tự động được" hoặc "phải làm thủ công":

1. **Đọc** `docs/eba-cli-apple-utils-reference.md` — tài liệu đầy đủ những gì `@expo/apple-utils` làm được (đã kiểm chứng từ eba-cli).
2. **Kiểm tra** source `~/Projects/eba-cli/src/` nếu cần tra cứu thêm.
3. Chỉ kết luận "không làm được" sau khi đã tra cứu cả hai nguồn trên.

**Tóm tắt nhanh những gì ĐÃ làm được:**
- Tạo + download App Store Connect API Key (`.p8`) tự động
- Tạo / reuse / xoá Certificates và Provisioning Profiles
- Đăng ký / liệt kê Devices
- Tạo / liệt kê Bundle IDs và Capabilities
- Gọi App Store Connect REST API (JWT) — Xcode Cloud, SCM, CI workflows
