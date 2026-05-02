"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";

interface Props {
  appName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AppStoreKeyModal({ appName, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [keyId, setKeyId]         = useState("");
  const [issuerId, setIssuerId]   = useState("");
  const [p8, setP8]               = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function handleSave() {
    if (!keyId.trim() || !issuerId.trim() || !p8.trim()) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch(`/api/apps/${encodeURIComponent(appName)}/app-store-key`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body:    JSON.stringify({ keyId: keyId.trim(), issuerId: issuerId.trim(), privateKeyP8: p8.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi không xác định");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl p-6 text-white z-10" style={GLASS}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold">App Store Connect API Key</h2>
            <p className="text-xs text-white/40 mt-0.5">{appName}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info box */}
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl px-4 py-3 mb-5 text-xs text-blue-200 leading-relaxed">
          Tạo API key tại{" "}
          <span className="font-semibold text-blue-300">
            App Store Connect → Users and Access → Integrations → App Store Connect API
          </span>
          . Cần role <span className="font-semibold">Admin</span> hoặc{" "}
          <span className="font-semibold">App Manager</span>.
          File <code className="bg-white/10 px-1 rounded">.p8</code> chỉ download được 1 lần.
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-5">
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

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">
              Private Key (.p8)
            </label>
            <textarea
              value={p8}
              onChange={(e) => setP8(e.target.value)}
              placeholder={"-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49...\n-----END PRIVATE KEY-----"}
              rows={5}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/50 font-mono resize-none"
            />
            <p className="text-[10px] text-white/30 mt-1">
              Paste toàn bộ nội dung file AuthKey_XXXXXXXX.p8
            </p>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/10 hover:bg-white/15 transition"
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-white/90 disabled:opacity-40 transition"
          >
            {saving ? "Đang lưu..." : "Lưu key"}
          </button>
        </div>
      </div>
    </div>
  );
}
