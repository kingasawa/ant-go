"use client";
import { GLASS } from "@/lib/glass";
import { HiOutlinePaperAirplane } from "react-icons/hi2";

export default function SubmissionPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Submission</h1>
      <p className="text-sm text-white/50 mb-6">Quản lý các bản build đã submit lên TestFlight.</p>

      <div className="rounded-2xl p-10 flex flex-col items-center text-center gap-3" style={GLASS}>
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
          <HiOutlinePaperAirplane className="w-6 h-6 text-white/40" />
        </div>
        <p className="text-sm text-white/50">Chưa có bản build nào được submit.</p>
        <p className="text-xs text-white/30 max-w-xs">
          Sau khi build hoàn thành, bạn có thể submit lên TestFlight từ trang Builds.
        </p>
      </div>
    </div>
  );
}
