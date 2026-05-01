"use client";
import { GLASS } from "@/lib/glass";
import { HiOutlineCloud, HiOutlineCheckCircle, HiOutlineWrenchScrewdriver, HiOutlineKey } from "react-icons/hi2";

const BENEFITS = [
  "25 giờ compute miễn phí mỗi tháng cho thành viên Apple Developer Program.",
  "Build, test, và archive app trực tiếp trên hạ tầng của Apple.",
  "Tích hợp sẵn với TestFlight và App Store Connect để phân phối nhanh.",
  "Chạy parallel workflows — test trên nhiều thiết bị và OS cùng lúc.",
];

export default function XcodeCloudPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Xcode Cloud</h1>
      <p className="text-sm text-white/50 mb-6">CI/CD được tích hợp sẵn trong hệ sinh thái Apple.</p>

      {/* Overview card */}
      <div className="rounded-2xl p-6 mb-5" style={GLASS}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <HiOutlineCloud className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Xcode Cloud là gì?</h2>
            <p className="text-sm text-white/50 leading-relaxed">
              Xcode Cloud là dịch vụ CI/CD của Apple, được tích hợp trực tiếp vào Xcode và App Store Connect.
              Nó cho phép bạn tự động build, test, và phân phối app iOS/macOS mà không cần quản lý
              máy chủ hay agent riêng.
            </p>
          </div>
        </div>
      </div>

      {/* 25h free benefit */}
      <div className="rounded-2xl p-6 mb-5 border border-green-500/20" style={{ ...GLASS, background: "rgba(34,197,94,0.06)" }}>
        <div className="flex items-start gap-3 mb-4">
          <HiOutlineCheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-400">25 giờ miễn phí mỗi tháng</p>
            <p className="text-xs text-white/40 mt-0.5">
              Dành cho thành viên Apple Developer Program ($99/năm). Đủ để build và test hầu hết các app cỡ vừa.
            </p>
          </div>
        </div>
        <ul className="space-y-2.5">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/60 flex-shrink-0 mt-1.5" />
              <span className="text-xs text-white/50 leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Ant Go integration note */}
      <div className="rounded-2xl p-6 mb-5" style={GLASS}>
        <div className="flex items-start gap-3 mb-3">
          <HiOutlineKey className="w-5 h-5 text-white/50 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">Ant Go quản lý Xcode Cloud thay bạn</p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Để tương tác với Xcode Cloud, Ant Go sẽ sử dụng Apple ID credentials của bạn để xác thực
              với App Store Connect API. Credentials được mã hóa và chỉ dùng để thực hiện các thao tác
              bạn yêu cầu — tạo workflow, trigger build, lấy kết quả test.
            </p>
          </div>
        </div>
        <div className="mt-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-white/30 leading-relaxed">
            <span className="text-white/50 font-medium">Lưu ý bảo mật:</span>{" "}
            Credentials của bạn không bao giờ được chia sẻ với bên thứ ba và chỉ được lưu trữ
            dưới dạng mã hóa trong hệ thống của Ant Go.
          </p>
        </div>
      </div>

      {/* Coming soon */}
      <div className="rounded-2xl p-6 flex items-center gap-3" style={GLASS}>
        <HiOutlineWrenchScrewdriver className="w-5 h-5 text-white/30 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-white/50">Tính năng đang được xây dựng</p>
          <p className="text-xs text-white/30 mt-0.5">
            Tích hợp Xcode Cloud sẽ sớm ra mắt. Bạn sẽ có thể kết nối Apple ID và quản lý
            toàn bộ Xcode Cloud workflow ngay trong Ant Go.
          </p>
        </div>
      </div>
    </div>
  );
}
