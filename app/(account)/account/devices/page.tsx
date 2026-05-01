"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { GLASS } from "@/lib/glass";

interface Device {
  udid: string;
  name: string | null;
  deviceProduct: string | null;
  deviceSerial: string | null;
  source: "dashboard" | "cli";
  addedAt: string | null;
}

type EnrollStep = "idle" | "creating" | "scanning" | "naming" | "saving" | "done" | "error" | "timeout";

// ── Modal ──────────────────────────────────────────────────────────────────────

function AddDeviceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<EnrollStep>("idle");
  const [enrollUrl, setEnrollUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [enrollToken, setEnrollToken] = useState("");
  const [pendingDevice, setPendingDevice] = useState<{ udid: string; deviceProduct: string | null; deviceSerial: string | null } | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn dẹp poll/timeout khi unmount
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function startEnrollment() {
    setStep("creating");
    setError("");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/device-enroll/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ source: "dashboard", origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không tạo được enrollment");

      const landingUrl = `${window.location.origin}/enroll/${data.token}`;
      setEnrollUrl(landingUrl);
      setEnrollToken(data.token);

      // Tạo QR code
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(landingUrl, { width: 220, margin: 2 });
      setQrDataUrl(dataUrl);
      setStep("scanning");

      // Bắt đầu poll status
      pollRef.current = setInterval(() => pollStatus(data.token), 3000);

      // Timeout sau 10 phút
      timeoutRef.current = setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep("timeout");
      }, 10 * 60 * 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
      setStep("error");
    }
  }

  async function pollStatus(token: string) {
    try {
      const res = await fetch(`/api/device-enroll/${token}/status`);
      const data = await res.json();

      if (data.status === "registered" && data.udid) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setPendingDevice({ udid: data.udid, deviceProduct: data.deviceProduct, deviceSerial: data.deviceSerial });
        setDeviceName(data.deviceProduct ? formatProduct(data.deviceProduct) : "iPhone");
        setStep("naming");
      } else if (data.status === "expired") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep("timeout");
      }
    } catch {
      // network hiccup, tiếp tục poll
    }
  }

  async function saveDevice() {
    if (!pendingDevice || !deviceName.trim()) return;
    setStep("saving");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          udid: pendingDevice.udid,
          name: deviceName.trim(),
          deviceProduct: pendingDevice.deviceProduct,
          deviceSerial: pendingDevice.deviceSerial,
          source: "dashboard",
        }),
      });
      if (!res.ok) throw new Error("Lưu device thất bại");
      setStep("done");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
      setStep("error");
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(enrollUrl).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-sm rounded-2xl p-6 text-white z-10"
        style={GLASS}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Thêm iPhone</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* idle */}
        {step === "idle" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
              </svg>
            </div>
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              Quét QR code bằng camera iPhone của bạn để đăng ký UDID vào tài khoản.
            </p>
            <button
              onClick={startEnrollment}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition"
            >
              Bắt đầu
            </button>
          </div>
        )}

        {/* creating */}
        {step === "creating" && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">Đang tạo mã đăng ký...</p>
          </div>
        )}

        {/* scanning */}
        {step === "scanning" && (
          <div className="text-center">
            <p className="text-sm text-white/60 mb-4">
              Mở <strong className="text-white">Camera</strong> trên iPhone và quét mã bên dưới
            </p>

            {qrDataUrl && (
              <div className="flex justify-center mb-4">
                <div className="p-2 bg-white rounded-xl inline-block">
                  <img src={qrDataUrl} alt="QR Code" width={200} height={200} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-4">
              <span className="text-xs text-white/50 truncate flex-1 font-mono">{enrollUrl}</span>
              <button onClick={copyUrl} className="text-white/40 hover:text-white transition flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              Đang chờ iPhone xác nhận...
            </div>
          </div>
        )}

        {/* naming */}
        {step === "naming" && pendingDevice && (
          <div>
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-400/20 rounded-xl px-4 py-3 mb-5">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-300">Device đã được thêm!</p>
                <p className="text-xs text-white/50 font-mono mt-0.5">{pendingDevice.udid}</p>
              </div>
            </div>

            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Đặt tên thiết bị
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveDevice()}
              placeholder="My iPhone"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 mb-4"
            />

            <button
              onClick={saveDevice}
              disabled={!deviceName.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Lưu device
            </button>
          </div>
        )}

        {/* saving */}
        {step === "saving" && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">Đang lưu...</p>
          </div>
        )}

        {/* done */}
        {step === "done" && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-white mb-1">Device đã được thêm!</p>
            <p className="text-sm text-white/50 mb-5">Thiết bị của bạn đã được đăng ký thành công.</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition"
            >
              Đóng
            </button>
          </div>
        )}

        {/* timeout */}
        {step === "timeout" && (
          <div className="text-center py-4">
            <p className="text-white/70 mb-2 font-semibold">Hết thời gian chờ</p>
            <p className="text-sm text-white/50 mb-5">QR code đã hết hạn (10 phút). Vui lòng thử lại.</p>
            <button
              onClick={() => { setStep("idle"); setQrDataUrl(""); setEnrollUrl(""); }}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* error */}
        {step === "error" && (
          <div className="text-center py-4">
            <p className="text-red-400 mb-2 font-semibold">Có lỗi xảy ra</p>
            <p className="text-sm text-white/50 mb-5">{error}</p>
            <button
              onClick={() => setStep("idle")}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DevicesPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingUdid, setDeletingUdid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "devices"),
      orderBy("addedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setDevices(snap.docs.map((d) => {
        const data = d.data();
        return {
          udid: d.id,
          name: data.name ?? null,
          deviceProduct: data.deviceProduct ?? null,
          deviceSerial: data.deviceSerial ?? null,
          source: data.source ?? "dashboard",
          addedAt: data.addedAt?.toDate?.()?.toISOString() ?? null,
        };
      }));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  async function deleteDevice(udid: string) {
    if (!user) return;
    setDeletingUdid(udid);
    try {
      const idToken = await user.getIdToken();
      await fetch(`/api/devices?udid=${encodeURIComponent(udid)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
    } finally {
      setDeletingUdid(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Devices</h1>
          <p className="text-white/50 text-sm mt-1">
            Quản lý các thiết bị iOS đã đăng ký vào tài khoản của bạn.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-white/90 transition flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm device
        </button>
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={GLASS}>
        {loading ? (
          <div className="text-center py-12 text-white/40">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Đang tải...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/8 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
              </svg>
            </div>
            <p className="text-white/50 text-sm font-medium">Chưa có device nào</p>
            <p className="text-white/30 text-xs mt-1">
              Thêm iPhone để build app với profile Development.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/8">
            {devices.map((device) => (
              <li key={device.udid} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {device.name ?? device.deviceProduct ?? "Unknown Device"}
                  </p>
                  <p className="text-xs text-white/40 font-mono truncate mt-0.5">{device.udid}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {device.deviceProduct && (
                      <span className="text-xs text-white/40">{device.deviceProduct}</span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                      device.source === "cli"
                        ? "bg-blue-500/10 text-blue-300 border-blue-400/20"
                        : "bg-purple-500/10 text-purple-300 border-purple-400/20"
                    }`}>
                      {device.source === "cli" ? "CLI" : "Dashboard"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {device.addedAt && (
                    <span className="text-xs text-white/30 hidden sm:block">
                      {new Date(device.addedAt).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                  <button
                    onClick={() => deleteDevice(device.udid)}
                    disabled={deletingUdid === device.udid}
                    className="text-white/30 hover:text-red-400 transition disabled:opacity-40"
                  >
                    {deletingUdid === device.udid ? (
                      <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info box */}
      <div className="mt-4 rounded-xl px-4 py-3 bg-white/5 border border-white/10">
        <p className="text-xs text-white/40 leading-relaxed">
          Các thiết bị này sẽ được đăng ký trên Apple Developer Connect khi bạn chạy{" "}
          <code className="text-white/60 bg-white/10 px-1 py-0.5 rounded">ant-go build --profile development</code>.
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <AddDeviceModal
          onClose={() => setShowModal(false)}
          onAdded={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatProduct(raw: string): string {
  // "iPhone16,2" → "iPhone 16 Pro Max" (fallback: giữ nguyên)
  const map: Record<string, string> = {
    "iPhone17,4": "iPhone 16e",
    "iPhone17,1": "iPhone 16 Pro Max",
    "iPhone17,2": "iPhone 16 Pro",
    "iPhone17,3": "iPhone 16 Plus",
    "iPhone17,5": "iPhone 16",
    "iPhone16,1": "iPhone 15 Pro",
    "iPhone16,2": "iPhone 15 Pro Max",
    "iPhone15,4": "iPhone 15",
    "iPhone15,5": "iPhone 15 Plus",
    "iPhone14,6": "iPhone SE (3rd gen)",
  };
  return map[raw] ?? raw;
}
