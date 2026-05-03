"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";
import {
  HiOutlineXMark,
  HiOutlineKey,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineArrowTopRightOnSquare,
} from "react-icons/hi2";

interface AscStatus {
  hasKey: boolean;
  keyId: string | null;
  issuerId: string | null;
}

interface Props {
  status: AscStatus;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Right-side drawer hiển thị khi user submit TestFlight nhưng thiếu ASC credentials.
 *
 * Cases:
 * 1. hasKey=false → chưa có .p8 → hướng dẫn chạy `ant-go auth login`
 * 2. hasKey=true, keyId/issuerId null → có .p8 nhưng thiếu Key ID / Issuer ID → cho nhập inline
 */
export default function AscMissingPanel({ status, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [keyId, setKeyId]       = useState(status.keyId ?? "");
  const [issuerId, setIssuerId] = useState(status.issuerId ?? "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [saved, setSaved]       = useState(false);

  const needsP8    = !status.hasKey;
  const needsIds   = status.hasKey && (!status.keyId || !status.issuerId);

  async function handleSave() {
    if (!keyId.trim() || !issuerId.trim()) {
      setError("Key ID và Issuer ID là bắt buộc");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/user/asc-credentials", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body:    JSON.stringify({ keyId: keyId.trim(), issuerId: issuerId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi không xác định");
      setSaved(true);
      setTimeout(() => { onSaved(); }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm flex flex-col text-white shadow-2xl"
        style={GLASS}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <HiOutlineKey className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm">App Store Connect Credentials</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Case 1: Chưa có .p8 → cần CLI login */}
          {needsP8 && (
            <>
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-400/20 rounded-xl px-4 py-3">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200 leading-relaxed">
                  Private key (.p8) chưa được cấu hình. Cần đăng nhập qua CLI để tự động lấy từ Apple Developer.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Cách thiết lập
                </p>
                <div className="space-y-3 text-sm text-white/80">
                  <Step n={1} text="Mở Terminal và chạy lệnh đăng nhập:" />
                  <code className="block bg-black/40 rounded-xl px-4 py-3 text-xs font-mono text-green-300">
                    ant-go auth login
                  </code>
                  <Step n={2} text="Chọn Yes khi được hỏi setup App Store Connect." />
                  <Step n={3} text="Đăng nhập Apple Developer — CLI sẽ tự tạo và download key." />
                  <Step n={4} text="Sau đó quay lại đây và thử Submit lại." />
                </div>
              </div>
            </>
          )}

          {/* Case 2: Có .p8 nhưng thiếu keyId / issuerId */}
          {needsIds && (
            <>
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-400/20 rounded-xl px-4 py-3">
                <HiOutlineKey className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-200 leading-relaxed">
                  Private key đã có. Cần bổ sung <strong>Key ID</strong> và <strong>Issuer ID</strong> từ App Store Connect.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Tìm trên App Store Connect
                </p>
                <a
                  href="https://appstoreconnect.apple.com/access/integrations/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition"
                >
                  <HiOutlineArrowTopRightOnSquare className="w-4 h-4" />
                  Users and Access → Integrations → App Store Connect API
                </a>
                <p className="text-xs text-white/40 mt-1">
                  Key ID và Issuer ID hiển thị ở đầu trang, phía trên danh sách keys.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">
                    Key ID
                  </label>
                  <input
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    placeholder="VD: 2X9R4HXF34"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">
                    Issuer ID
                  </label>
                  <input
                    value={issuerId}
                    onChange={(e) => setIssuerId(e.target.value)}
                    placeholder="VD: 69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 font-mono"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              {saved ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <HiOutlineCheckCircle className="w-5 h-5" />
                  Đã lưu — đang retry submit...
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-white/90 disabled:opacity-40 transition"
                >
                  {saving ? "Đang lưu..." : "Lưu và thử lại"}
                </button>
              )}
            </>
          )}

          {/* Hint: Settings */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-white/40">
              Bạn có thể quản lý credentials tại{" "}
              <a href="/account/settings" className="text-white/60 underline hover:text-white transition">
                Settings → Apple Developer
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-xs flex items-center justify-center font-bold text-white/60">
        {n}
      </span>
      <span className="text-white/70 text-sm">{text}</span>
    </div>
  );
}

